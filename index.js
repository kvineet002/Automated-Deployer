import express from 'express';
import bodyParser from 'body-parser';
import repoRoutes from './routes/repoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { handleDeploymentLogs } from './controllers/repoController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', repoRoutes);

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection',handleDeploymentLogs);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
