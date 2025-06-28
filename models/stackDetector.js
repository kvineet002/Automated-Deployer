import fs from 'fs';
import path from 'path';

export const detectStack = (repoPath) => {
    const exists = (file) => fs.existsSync(path.join(repoPath, file));
    //detect vite+react
    if (exists('vite.config.js') && exists('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json')));
        if (pkg.dependencies?.react) return 'Vite';
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

export const detectEntryFile = (repoPath) => {
    const files = fs.readdirSync(repoPath);
    // Check for common entry files 
    const entryFiles = ['index.js', 'app.js', 'server.js', 'main.js'];
    for (const file of entryFiles) {
        if (files.includes(file)) {
            return file;
        }   
    }
    // Fallback to the first JavaScript file found
    const jsFiles = files.filter(file => file.endsWith('.js'));
    return jsFiles.length > 0 ? jsFiles[0] : 'index.js';
}   

export const detectIndexFilePORT = (repoPath) => {
    //repoPath is index.js file path
    const content = fs.readFileSync(repoPath, 'utf-8');
        const envFilePath = path.join(path.dirname(repoPath), '.env.voomly');
        if (fs.existsSync(envFilePath)) {
            const envContent = fs.readFileSync(envFilePath, 'utf-8');
            const envPortMatch = envContent.match(/^PORT\s*=\s*["']?(\d{2,5})["']?/m);
            if (envPortMatch) {
                return envPortMatch[1];
            }
        }
        // process.env.PORT = 3000
        let match = content.match(/process\.env\.PORT\s*=\s*(\d{2,5})/);
        if (match) return match[1];

        // process.env.PORT || 3000
        match = content.match(/process\.env\.PORT\s*\|\|\s*(\d{2,5})/);
        if (match) return match[1];

        // const port = 3000
        match = content.match(/(?:const|let|var)?\s*port\s*=\s*(\d{2,5})/i);
        if (match) return match[1];
        //const PORT = 3000
        match = content.match(/(?:const|let|var)?\s*PORT\s*=\s*(\d{2,5})/i);
        if (match) return match[1];
        
        // app.listen(3000)
        match = content.match(/\.listen\s*\(\s*(\d{2,5})\s*\)/);
        if (match) return match[1];
    return defaultPort;
}