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
        res.render('form', { error: '❌ Failed to detect stack.' });
    }
};

import { execSync,spawn } from 'child_process';

export const handleContainerization = async (req, res) => {
    const { repo, stack, subdomain,port } = req.body;
    if (!repo || !subdomain) return res.status(400).send('❌ Repo and subdomain required.');

    const subdomainSafe = subdomain.replace(/[^a-zA-Z0-9\-]/g, '');
    const confPath = `/etc/nginx/sites-available/${subdomainSafe}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${subdomainSafe}.conf`;

    // Render result.ejs with logs
    res.render('result', {
        repo,
        stack,
        startLogs: true,
        port,
        encodedRepo: encodeURIComponent(repo),
    });

    // Delay a bit before running background steps
    setTimeout(() => {
        const confContent = `
server {
    listen 80;
    server_name ${subdomainSafe}.voomly.xyz;

    location / {
        proxy_pass http://localhost:${port};  # Replace dynamically if needed
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
        `;

        // Write config file
        fs.writeFileSync(confPath, confContent);
        fs.writeFileSync(enabledPath, confContent);

        // Reload NGINX
        try {
            execSync('sudo nginx -s reload');
            execSync(`sudo certbot --nginx -d ${subdomainSafe}.voomly.xyz`);
            console.log(`✅ NGINX reloaded for ${subdomainSafe}`);
        } catch (err) {
            console.error('❌ Failed to reload NGINX:', err.message);
        }
    }, 4000); // Enough time for container to start
};

export const handleDeploymentLogs = (req, res) => {
    const { repo } = req.query;
    if (!repo) return res.status(400).end('No repo in query');

    const repoName = repo.split('/').pop().replace('.git', '');
    const tempPath = path.join('./cloned_repos', repoName);
    const composePath = path.join(tempPath, 'docker-compose.yml');

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Spawn docker compose with plain output to disable buffering
    const child = spawn('docker', [
        'compose',
        '-f',
        composePath,
        'up',
        '--build'
    ], {
  env: {
    ...process.env,
    DOCKER_BUILDKIT: '0'
  }
    });

    // Stream stdout line by line
    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                res.write(`data: ${line}\n\n`);
            }
        });
    });

    // Stream stderr line by line
    child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                res.write(`data: ${line}\n\n`);
            }
        });
    });

    child.on('close', (code) => {
        res.write(`data: ✅ Deployment finished with exit code ${code}\n\n`);
        res.end();
    });

    req.on('close', () => {
        child.kill('SIGINT');
        res.end();
    });
};
