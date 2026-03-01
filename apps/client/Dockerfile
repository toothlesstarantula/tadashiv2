# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json bun.lockb* ./

# Copy apps/client package.json
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/client ./apps/client

# Build the application
WORKDIR /app/apps/client
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
