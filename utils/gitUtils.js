import simpleGit from 'simple-git';
import fs from 'fs';

export const cloneRepo = async (url, targetPath, branch = 'main') => {
    const git = simpleGit();
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
    }
    await git.clone(url, targetPath, ['--branch', branch, '--single-branch']);
};
