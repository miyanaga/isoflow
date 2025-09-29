FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy application source
COPY . .

# Copy and set executable permission for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports for both client and server
EXPOSE 3000 3080

# Use exec form to ensure PID 1 receives signals properly
ENTRYPOINT ["docker-entrypoint.sh"]