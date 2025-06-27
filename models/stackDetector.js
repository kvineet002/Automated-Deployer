import fs from 'fs';
import path from 'path';

export const detectStack = (repoPath) => {
    const exists = (file) => fs.existsSync(path.join(repoPath, file));
    //detect vite+react
    if (exists('vite.config.js') && exists('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json')));
        if (pkg.dependencies?.react) return 'React';
    }
    if (exists('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json')));
        if (pkg.dependencies?.next) return 'Next.js';
        if (pkg.dependencies?.react) return 'React';
        return 'Node.js';
    }
    if (exists('requirements.txt')) return 'Python';
    if (exists('manage.py')) return 'Django';
    if (exists('composer.json')) return 'PHP';
    if (exists('Gemfile')) return 'Ruby';
    if (exists('go.mod')) return 'Go';
    if (exists('Cargo.toml')) return 'Rust';
    if (exists('index.html') && !exists('package.json')) return 'Static Site';
    return 'Unknown';
};
