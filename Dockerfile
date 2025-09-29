FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --production=false

# Copy pre-built dist-app directory
COPY dist-app ./dist-app

# Copy source files needed for the server
COPY src/server ./src/server
COPY tsconfig.server.json ./

# Copy data directory if it exists
COPY data ./data

# Copy environment files
COPY .env* ./

# Copy and set executable permission for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 3000 for all-in-one server
EXPOSE 3000

# Use exec form to ensure PID 1 receives signals properly
ENTRYPOINT ["docker-entrypoint.sh"]