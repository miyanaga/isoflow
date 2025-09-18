FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy application source
COPY . .

# Expose ports for both client and server
EXPOSE 3000 3080

# Start both client and server
CMD ["yarn", "all-in-one"]