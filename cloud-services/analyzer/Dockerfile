# Simple Analyzer Service Dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package file
COPY package.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY index.js ./

# Expose port
EXPOSE 8080

# Start the service
CMD ["npm", "start"]