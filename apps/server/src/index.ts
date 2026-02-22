import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import { mastra } from './mastra'

const app = new Hono()

app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8100', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}))

app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

app.post('/api/chat', async (c) => {
  const { message } = await c.req.json()
  
  const agent = mastra.getAgent("orchestratorAgent")
  
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404)
  }

  const result = await agent.generate(message)

  return c.json({ 
    response: result.text,
    toolCalls: result.toolCalls 
  })
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
