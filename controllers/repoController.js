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
        const port=generatePORT();
        addDockerComposefile(port, tempPath);
    }
        // fs.rmSync(tempPath, { recursive: true, force: true });
        res.render('result', { stack, repo: githubUrl });
    } catch (err) {
        console.error(err);
        res.render('form', { error: 'Failed to detect stack.' });
    }
};
import { exec } from 'child_process';

export const handleContainerization = async (req, res) => {
    const { repo } = req.body;
    if (!repo) return res.status(400).send('No repo provided.');

    const repoName = repo.split('/').pop().replace('.git', '');
    const tempPath = path.join('./cloned_repos', repoName);
    const composePath = path.join(tempPath, 'docker-compose.yml');

    try {
        exec(`docker compose -f ${composePath} up -d --build`, (err, stdout, stderr) => {
            if (err) {
                console.error('Docker error:', stderr);
                return res.status(500).send('❌ Failed to deploy.');
            }

            console.log('Docker deployed successfully:', stdout);
            res.send(`✅ Deployment started for ${repoName}!<br><a href="/">Go Back</a>`);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Deployment failed.');
    }
};
