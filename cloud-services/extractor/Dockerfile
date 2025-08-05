# Analyzer Service Dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and shared dependencies
COPY src/ ./src/
COPY ../shared/ ./shared/

# Copy TypeScript config
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Start the service
CMD ["npm", "start"]