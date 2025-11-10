FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "run", "dev"]

