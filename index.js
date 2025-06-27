import express from 'express';
import bodyParser from 'body-parser';
import repoRoutes from './routes/repoRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { WebSocketServer } from 'ws';
import { spawn, execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/voomly.xyz/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/voomly.xyz/fullchain.pem'),
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', repoRoutes);

// Create HTTP server
const server = https.createServer(sslOptions, app);


// Attach WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.replace('/?', ''));
  const repo = urlParams.get('repo');
  const subdomainSafe = urlParams.get('subdomainSafe');
  const port = urlParams.get('port');

  if (!repo || !subdomainSafe || !port) {
    ws.send('❌ Missing parameters');
    ws.close();
    return;
  }

  const repoName = repo.split('/').pop().replace('.git', '');
  const tempPath = path.join('./cloned_repos', repoName);
  const composePath = path.join(tempPath, 'docker-compose.yml');

  const build = spawn('docker', ['compose', '-f', composePath, 'build']);

  build.stdout.on('data', (data) => ws.send(data.toString()));
  build.stderr.on('data', (data) => ws.send(data.toString()));

  build.on('close', (code) => {
    if (code !== 0) {
      ws.send(`❌ Build failed with exit code ${code}`);
      ws.close();
      return;
    }

    const run = spawn('docker', ['compose', '-f', composePath, 'up', '-d']);

    run.stdout.on('data', (data) => ws.send(data.toString()));
    run.stderr.on('data', (data) => ws.send(data.toString()));

    run.on('close', () => {
      ws.send(`✅ Deployment successful on port ${port}`);

      const confPath = `/etc/nginx/sites-available/${subdomainSafe}.conf`;
      const enabledPath = `/etc/nginx/sites-enabled/${subdomainSafe}.conf`;

      const confContent = `
server {
    listen 80;
    server_name ${subdomainSafe}.voomly.xyz;

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
      `;

      try {
        fs.writeFileSync(confPath, confContent);
        fs.writeFileSync(enabledPath, confContent);

        execSync('sudo nginx -s reload');
        execSync(`sudo certbot --nginx -d ${subdomainSafe}.voomly.xyz`);

        ws.send(`nginx-ready:${subdomainSafe}.voomly.xyz`);
      } catch (err) {
        ws.send(`❌ Failed to configure NGINX: ${err.message}`);
      }

      ws.close();
    });
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
