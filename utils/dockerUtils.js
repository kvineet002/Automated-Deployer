import fs from 'fs';
import path from 'path';

const to_snakeCase = (str) => {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}
export const addDockerComposefile = (port, repoPath) => {
  const content = `
services:
  ${to_snakeCase(path.basename(repoPath))}:
    image: ${to_snakeCase(path.basename(repoPath))}_image
    container_name: ${to_snakeCase(path.basename(repoPath))}_container
    restart: always
    build:
        context: .
    ports:
      - "${port}:3000"
    env_file: 
      - .env.voomly
    command: sh -c "cd /app && serve -s build"
  `;

  fs.writeFileSync(path.join(repoPath, 'docker-compose.yml'), content.trim());
};
export const addDockerfile = (repoPath) => {
    const dockerfileContent = `
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g serve
COPY package* ./
RUN npm install
COPY . .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build
    `;
    fs.writeFileSync(path.join(repoPath, 'Dockerfile'), dockerfileContent.trim());
}
export const addEnvFile = (repoPath, envContent) => {
    const envFilePath = path.join(repoPath, '.env.voomly');
    if (envContent) {
        fs.writeFileSync(envFilePath, envContent.trim());
    } else {
        fs.writeFileSync(envFilePath, '');
    }
};

export const addNodeDockerfile = (repoPath,enterFile) => {
    const dockerfileContent = `
FROM node:20-alpine
WORKDIR /app/backend
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD [ "node","${enterFile}" ]
    `;
    fs.writeFileSync(path.join(repoPath, 'Dockerfile'), dockerfileContent.trim());
}
export const addNodeDockerComposefile = (port,usersPort, repoPath) => {
    const content = `
services:
  ${to_snakeCase(path.basename(repoPath))}:
    image: ${to_snakeCase(path.basename(repoPath))}_image
    container_name: ${to_snakeCase(path.basename(repoPath))}_container
    restart: always
    build:
        context: .
        dockerfile: Dockerfile
    ports:
      - "${port}:${usersPort}"
    env_file: 
      - .env.voomly
    `; 
    fs.writeFileSync(path.join(repoPath, 'docker-compose.yml'), content.trim());
};