# Stage 1
# Start from official Node 20 alpine Image
# Alpine - lightweight linux 
FROM node:20-slim AS base

# Set working directory inside container
# All subsequest commands run from here
WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Stage 2 - Dependencies
FROM base AS deps

# Copy package files first — before copying all code
# Docker caches layers — if package.json hasn't changed,
# it won't re-run npm install on every build
COPY package*.json ./

# Install all dependencies including devDependencies
# We need prisma CLI which is in devDependencies
RUN npm ci

# Stage 3 - Production
FROM base AS production

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all server code
COPY . .

# Generate Prisma client
# Must run after copying code and node_modules
RUN npx prisma generate

# Expose port server runs on
EXPOSE 5050

# Start command
CMD ["node", "server.js"]