# Use a Node.js base image
FROM node:20

# Install Docker CLI
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Expose backend port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
