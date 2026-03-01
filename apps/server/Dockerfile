# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json bun.lockb* ./

# Copy apps/server package.json
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/server ./apps/server

# Generate Prisma Client
WORKDIR /app/apps/server
RUN bunx prisma generate

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
