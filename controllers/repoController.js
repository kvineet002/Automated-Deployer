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

    // Check if subdomain is already in use
    if (fs.existsSync(enabledPath)) {
        return res.status(400).send('❌ Subdomain already in use. Please choose another.');
    }
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

export const handleDeploymentLogs = (req, res) => {
    const { repo,subdomainSafe,port } = req.query;
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
// Step 1: Build first
const build = spawn('docker', [
  'compose',
  '-f',
  composePath,
  'build'
]);

build.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[build stdout]', text);
    text.split('\n').forEach(line => {
        if (line.trim()) res.write(`data: ${line}\n\n`);
    });
});

build.stderr.on('data', (data) => {
    const text = data.toString();
    console.error('[build stderr]', text);
    text.split('\n').forEach(line => {
        if (line.trim()) res.write(`data: ${line}\n\n`);
    });
});

build.on('close', (code) => {
    if (code !== 0) {
        res.write(`data: ❌ Build failed with exit code ${code}\n\n`);
        res.end();
        return;
    }

    // Step 2: Now run
    const run = spawn('docker', [
        'compose',
        '-f',
        composePath,
        'up',
        '-d'
    ]);

    run.stdout.on('data', (data) => {
        const text = data.toString();
        console.log('[run stdout]', text);
        text.split('\n').forEach(line => {
            if (line.trim()) res.write(`data: ${line}\n\n`);
        });
    });

    run.stderr.on('data', (data) => {
        const text = data.toString();
        console.error('[run stderr]', text);
        text.split('\n').forEach(line => {
            if (line.trim()) res.write(`data: ${line}\n\n`);
        });
    });

  run.on('close', (runCode) => {
    res.write(`data: ✅ Deployment finished with exit code ${runCode}\n\n`);
    const confPath = `/etc/nginx/sites-available/${subdomainSafe}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${subdomainSafe}.conf`;
    // Now that the container is up, configure NGINX
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

    try {
        // Write or overwrite config
        fs.writeFileSync(confPath, confContent);
        fs.writeFileSync(enabledPath, confContent);

        // Reload NGINX
        execSync('sudo nginx -s reload');

        // Run certbot
        execSync(`sudo certbot --nginx -d ${subdomainSafe}.voomly.xyz`);
        res.write(`data: ✅ NGINX configured for ${subdomainSafe}.voomly.xyz\n\n`);
    } catch (err) {
        console.error('❌ Failed to configure NGINX:', err.message);
        res.write(`data: ❌ Failed to configure NGINX: ${err.message}\n\n`);
    }

    res.end();
});

});

};
