import { cloneRepo } from '../utils/gitUtils.js';
import { detectStack } from '../models/stackDetector.js';
import fs from 'fs';
import path from 'path';
import { addDockerComposefile, addDockerfile } from '../utils/dockerUtils.js';

export const showForm = (req, res) => {
    res.render('form');
};
const generatePORT = () => {
    return Math.floor(1000 + Math.random() * 9000);
}

export const handleRepoSubmit = async (req, res) => {
    const { githubUrl } = req.body;
    if (!githubUrl) return res.render('form', { error: 'GitHub URL is required' });

    const repoName = githubUrl.split('/').pop().replace('.git', '');
    const tempPath = path.join('./cloned_repos', repoName);

    try {
        await cloneRepo(githubUrl, tempPath);
        const stack = detectStack(tempPath);

        const port = generatePORT();
        if(stack==='Vite') {
            //we dont have a facility to deploy vite apps yet
            return res.render('form', { error: 'Vite apps are not supported yet.' });
        }
        if (stack === 'React') {
            addDockerfile(tempPath);
            addDockerComposefile(port, tempPath);
        }
        
        // Show deploy page with button, but no logs yet
       res.render('result', {
    repo: githubUrl,
    stack,
    startLogs: false,
    encodedRepo: encodeURIComponent(githubUrl),
    port
});

    } catch (err) {
        console.error(err);
        res.render('form', { error: 'Failed to detect stack.' });
    }
};

import { execSync,spawn } from 'child_process';

export const handleContainerization = async (req, res) => {
    const { repo, stack, subdomain,port } = req.body;
    if (!repo || !subdomain) return res.status(400).send('❌ Repo and subdomain required.');

    const subdomainSafe = subdomain.replace(/[^a-zA-Z0-9\-]/g, '');
    const confPath = `/etc/nginx/sites-available/${subdomainSafe}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${subdomainSafe}.conf`;

    // Check if subdomain is already in use
        if (fs.existsSync(enabledPath)) {
  return res.render('result', {
    repo,
    stack,
    startLogs: false,
    subdomain: subdomainSafe,
    port,
    encodedRepo: encodeURIComponent(repo),
    error: 'Subdomain already in use. Please choose another.'
  });    }
    // Render result.ejs with logs
    res.render('result', {
        repo,
        stack,
        startLogs: true,
        subdomain: subdomainSafe,
        port,
        encodedRepo: encodeURIComponent(repo),
    });


};

export const handleDeploymentLogs = (ws, req) => {
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

let currentStep = null;
let stepStartTime = null;

build.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (!line.trim()) return;

    const timestamp = new Date().toLocaleTimeString();

    // Match start of a new step (e.g., "#1 [internal] load metadata...")
    const stepStartMatch = line.match(/^#(\d+)\s+(.*)$/);
    if (stepStartMatch) {
      currentStep = stepStartMatch[1];
      stepStartTime = Date.now();
      ws.send(`[${timestamp}] ${line}`);
      return;
    }

    // Match DONE lines like "#1 DONE 0.1s"
    const doneMatch = line.match(/^#(\d+)\s+DONE\s+([0-9.]+)s$/);
    if (doneMatch && doneMatch[1] === currentStep && stepStartTime) {
      const elapsed = ((Date.now() - stepStartTime) / 1000).toFixed(2);
      ws.send(`└── Took: ${elapsed}s\n`);
      return;
    }

    // For intermediate lines (like "transferring dockerfile...")
    ws.send(`[${timestamp}] ${line}`);
  });
});

  build.stderr.on('data', (data) => ws.send(data.toString()));

  build.on('close', (code) => {
    if (code !== 0) {
      ws.send(`❌ Build failed with exit code ${code}`);
      ws.close();
      return;
    }

    const run = spawn('docker', ['compose', '-f', composePath, 'up', '-d']);

let currentStep = null;
let stepStartTime = null;

build.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (!line.trim()) return;

    const timestamp = new Date().toLocaleTimeString();

    // Step start matcher
    const stepStartMatch = line.match(/^#(\d+)\s+(.*)$/);
    if (stepStartMatch) {
      currentStep = stepStartMatch[1];
      stepStartTime = Date.now();
      ws.send(`[${timestamp}] ${line}`);
      return;
    }

    // DONE matcher (fix: more general)
    const doneMatch = line.match(/^#(\d+).*DONE\s+([0-9.]+)s$/);
    if (doneMatch && doneMatch[1] === currentStep && stepStartTime) {
      const elapsed = ((Date.now() - stepStartTime) / 1000).toFixed(2);
      ws.send(`└── Took: ${elapsed}s\n`);
      return;
    }

    // Default log
    ws.send(`[${timestamp}] ${line}`);
  });
});


    run.stderr.on('data', (data) => ws.send(data.toString()));

    run.on('close', () => {
      ws.send(`Deployment successful!\nAssigning your subdomain...\n\n`);

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
        ws.send(`All done! Your app is now live at http://${subdomainSafe}.voomly.xyz`);
      } catch (err) {
        ws.send(`❌ Failed to configure NGINX: ${err.message}`);
      }

      ws.close();
    });
  });
}