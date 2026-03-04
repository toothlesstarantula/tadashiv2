# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Copy package.json and lockfile (if they exist in the context)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# run migrations
RUN bunx prisma migrate deploy

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
