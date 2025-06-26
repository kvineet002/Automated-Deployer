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

        if (stack === 'React') {
            addDockerfile(tempPath);
            const port = generatePORT();
            addDockerComposefile(port, tempPath);
        }

        // Show deploy page with button, but no logs yet
        res.render('result', {
            stack,
            repo: githubUrl,
            startLogs: false,
        });
    } catch (err) {
        console.error(err);
        res.render('form', { error: '❌ Failed to detect stack.' });
    }
};

import { exec,spawn } from 'child_process';

export const handleContainerization = async (req, res) => {
    const { repo, stack } = req.body;
    if (!repo) return res.status(400).send('❌ No repo provided.');

    // Just render the same `deploy.ejs`, but now with `startLogs: true`
    res.render('result', {
        repo,
        stack,
        startLogs: true,
    });
};

export const handleDeploymentLogs = (req, res) => {
    const { repo } = req.query;
    if (!repo) return res.status(400).end('No repo in query');

    const repoName = repo.split('/').pop().replace('.git', '');
    const tempPath = path.join('./cloned_repos', repoName);
    const composePath = path.join(tempPath, 'docker-compose.yml');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const child = spawn('docker-compose', ['-f', composePath, 'up', '--build']);

    child.stdout.on('data', (data) => {
        res.write(`data: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
    });

    child.stderr.on('data', (data) => {
        res.write(`data: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
    });

    child.on('close', (code) => {
        res.write(`data: ✅ Deployment finished with exit code ${code}\n\n`);
        res.end();
    });

    req.on('close', () => {
        child.kill();
        res.end();
    });
};
