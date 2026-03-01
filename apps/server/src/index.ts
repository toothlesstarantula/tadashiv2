import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import { mastra } from './mastra'
import { prisma } from './db'

const app = new Hono()

function getLastUserText(messages: any[]): string {
  if (!Array.isArray(messages)) return ''

  const userMessages = messages.filter((m) => m?.role === 'user')
  if (!userMessages.length) return ''

  const lastUser = userMessages[userMessages.length - 1]
  const parts = Array.isArray(lastUser?.parts) ? lastUser.parts : []

  const texts = parts
    .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text as string)

  return texts.join(' ').trim()
}

app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8100', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}))

app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

app.get('/api/conversations', async (c) => {
  try {
    const authSession = await auth.api.getSession({ headers: c.req.raw.headers })
    const userId = authSession?.user?.id

    if (!userId) {
      return c.json({ conversations: [] }, 200)
    }

    const search = c.req.query('q')?.trim()

    const where: any = {
      userId,
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          messages: {
            some: {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ]
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return c.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || 'Nueva conversación',
        updatedAt: conv.updatedAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error('Error in GET /api/conversations:', error)
    return c.json(
      {
        error: error.message || 'Internal Server Error',
      },
      500,
    )
  }
})

app.get('/api/conversations/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const authSession = await auth.api.getSession({ headers: c.req.raw.headers })
    const userId = authSession?.user?.id

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    return c.json({
      id: conversation.id,
      title: conversation.title || 'Nueva conversación',
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: m.content,
        toolCalls: m.toolCalls,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error('Error in GET /api/conversations/:id:', error)
    return c.json(
      {
        error: error.message || 'Internal Server Error',
      },
      500,
    )
  }
})

app.delete('/api/conversations/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const authSession = await auth.api.getSession({ headers: c.req.raw.headers })
    const userId = authSession?.user?.id

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    await prisma.conversation.delete({
      where: {
        id,
      },
    })

    return c.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/conversations/:id:', error)
    return c.json(
      {
        error: error.message || 'Internal Server Error',
      },
      500,
    )
  }
})

app.post('/api/chat', async (c) => {
  try {
    const { messages, conversationId } = await c.req.json()
    
    const agent = mastra.getAgent("orchestratorAgent")
    
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404)
    }
    // @ts-ignore
    const result = await agent.stream(messages)

    // Optional: associate this chat with a stored conversation
    const authSession = await auth.api.getSession({ headers: c.req.raw.headers })
    const userId = authSession?.user?.id ?? null

    let currentConversationId = conversationId as string | undefined
    if (!currentConversationId && userId) {
      const titleSource = getLastUserText(messages)
      const title =
        titleSource && titleSource.length > 0
          ? titleSource.slice(0, 80)
          : 'Nueva conversación'

      const created = await prisma.conversation.create({
        data: {
          userId,
          title,
        },
      })
      currentConversationId = created.id
    }

    const lastUserMessage = messages?.[messages.length - 1]
    let userContent = lastUserMessage?.content
    if (!userContent && Array.isArray(lastUserMessage?.parts)) {
      userContent = lastUserMessage.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('')
    }

    if (currentConversationId && userContent && userId) {
      await prisma.message.create({
        data: {
          conversationId: currentConversationId,
          role: 'user',
          content: userContent,
          userId,
        },
      })
    }

    let assistantBuffer = ''
    const toolCallsMap = new Map<string, any>()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = result.fullStream.getReader();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let chunk = '';
            switch (value.type) {
              case 'text-delta': {
                const text = value.payload.text as string
                assistantBuffer += text
                chunk = `0:${JSON.stringify(text)}\n`;
                break;
              }
              case 'tool-call': {
                toolCallsMap.set(value.payload.toolCallId, {
                  id: value.payload.toolCallId,
                  name: value.payload.toolName,
                  args: value.payload.args,
                  state: 'calling'
                })
                chunk = `9:${JSON.stringify({
                  toolCallId: value.payload.toolCallId,
                  toolName: value.payload.toolName,
                  args: value.payload.args
                })}\n`;
                break;
              }
              case 'tool-result': {
                const tc = toolCallsMap.get(value.payload.toolCallId)
                if (tc) {
                  tc.result = value.payload.result
                  tc.state = 'done'
                }
                chunk = `a:${JSON.stringify({
                  toolCallId: value.payload.toolCallId,
                  toolName: value.payload.toolName,
                  result: value.payload.result
                })}\n`;
                break;
              }
              case 'finish':
                chunk = `u:${JSON.stringify({
                  ...value,
                  conversationId: currentConversationId,
                })}\n`;

                const toolCalls = Array.from(toolCallsMap.values())

                if (currentConversationId && userId && (assistantBuffer || toolCalls.length > 0)) {
                  await prisma.message.create({
                    data: {
                      conversationId: currentConversationId,
                      role: 'assistant',
                      content: assistantBuffer,
                      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                      userId,
                    },
                  })
                }
                break;
            }

            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1'
      }
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error)
    return c.json({ 
      error: error.message || "Internal Server Error" 
    }, 500)
  }
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
