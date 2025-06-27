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

import fetch from 'node-fetch';

const getDefaultBranch = async (owner, repo) => {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    return data.default_branch || 'main';
};

export const handleRepoSubmit = async (req, res) => {
    const { githubUrl, branch: userBranch, subdirectory = '' } = req.body;

    if (!githubUrl) {
        return res.render('form', { error: 'GitHub URL is required' });
    }

    const repoName = githubUrl.split('/').pop().replace('.git', '');
    const tempPath = path.join('./cloned_repos', repoName);

    // Extract owner and repo from URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(\.git)?$/);
    if (!match) {
        return res.render('form', { error: 'Invalid GitHub URL format' });
    }
    const owner = match[1];
    const repo = match[2];

    try {
        const branch = userBranch || await getDefaultBranch(owner, repo);

        // Clone the selected or default branch
        await cloneRepo(githubUrl, tempPath, branch);

        // Adjust for subdirectory (if any)
        const finalPath = subdirectory ? path.join(tempPath, subdirectory) : tempPath;
        console.log(`Cloned repo to: ${finalPath}`);
        const stack = detectStack(finalPath);
        const port = generatePORT();

        if (stack === 'Vite') {
            return res.render('form', { error: 'Vite apps are not supported yet.' });
        }

        if (stack === 'React') {
            addDockerfile(finalPath);
            addDockerComposefile(port, finalPath);
        }

        res.render('result', {
            repo: githubUrl,
            stack,
            startLogs: false,
            encodedRepo: encodeURIComponent(githubUrl),
            port,
            subdirectory
        });

    } catch (err) {
        console.error(err);
        res.render('form', { error: 'Failed to detect stack or clone repo.' });
    }
};


import { execSync,spawn } from 'child_process';

export const handleContainerization = async (req, res) => {
    const { repo, stack, subdomain,port,subdirectory } = req.body;
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
    subdirectory,
    error: 'Subdomain already in use. Please choose another.'
  });    }
    // Render result.ejs with logs
    res.render('result', {
        repo,
        stack,
        startLogs: true,
        subdomain: subdomainSafe,
        port,
        subdirectory,
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
  var tempPath = path.join('./cloned_repos', repoName);
    const subdirectory = urlParams.get('subdirectory') || '';
     tempPath = subdirectory ? path.join(tempPath, subdirectory) : tempPath;
    console.log(`Subdirectory: ${subdirectory}`);
     console.log(`Starting deployment for repo: ${repoName} at path: ${tempPath}`);
  const composePath = path.join(tempPath, 'docker-compose.yml');

  const build = spawn('docker', ['compose', '-f', composePath, 'build']);

ws.send(`\n`)
const output = execSync('curl -s http://ip-api.com/line/?fields=city,regionName,country');
const location = output.toString().trim().split('\n').join(', ');
ws.send(`Server location: ${location}\n`);
const stepTimers = new Map();
build.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (!line.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    const stepStartMatch = line.match(/^#(\d+)\s+\[.*?\]/);

    // Start of step
    if (stepStartMatch) {
      const stepId = stepStartMatch[1];
      if (!stepTimers.has(stepId)) {
        stepTimers.set(stepId, Date.now());
      }
      ws.send(`[${timestamp}] ${line}`);
      return;
    }

    // DONE line
    const doneMatch = line.match(/^#(\d+).*DONE\s+([0-9.]+)s$/);
    if (doneMatch) {
      const stepId = doneMatch[1];
      const startTime = stepTimers.get(stepId);
      if (startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        ws.send(`[${timestamp}] ${line}`);
        ws.send(`└── Took: ${elapsed}s\n`);
      } else {
        ws.send(`[${timestamp}] ${line}`);
      }
      return;
    }

    // Fallback
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

const stepTimers = new Map();
build.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (!line.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    const stepStartMatch = line.match(/^#(\d+)\s+\[.*?\]/);

    // Start of step
    if (stepStartMatch) {
      const stepId = stepStartMatch[1];
      if (!stepTimers.has(stepId)) {
        stepTimers.set(stepId, Date.now());
      }
      ws.send(`[${timestamp}] ${line}`);
      return;
    }

    // DONE line
    const doneMatch = line.match(/^#(\d+).*DONE\s+([0-9.]+)s$/);
    if (doneMatch) {
      const stepId = doneMatch[1];
      const startTime = stepTimers.get(stepId);
      if (startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        ws.send(`[${timestamp}] ${line}`);
        ws.send(`└── Took: ${elapsed}s\n`);
      } else {
        ws.send(`[${timestamp}] ${line}`);
      }
      return;
    }

    // Fallback
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