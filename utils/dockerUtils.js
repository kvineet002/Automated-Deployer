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
RUN npm run build
    `;
    fs.writeFileSync(path.join(repoPath, 'Dockerfile'), dockerfileContent.trim());
}
