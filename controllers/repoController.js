import { cloneRepo } from "../utils/gitUtils.js";
import {
  detectEntryFile,
  detectIndexFilePORT,
  detectStack,
} from "../models/stackDetector.js";
import fs from "fs";
import path from "path";
import {
  addDockerComposefile,
  addDockerfile,
  addEnvFile,
  addNodeDockerComposefile,
  addNodeDockerfile,
} from "../utils/dockerUtils.js";

export const showForm = (req, res) => {
  res.render("form");
};
const generatePORT = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

import fetch from "node-fetch";

const getDefaultBranch = async (owner, repo) => {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return data.default_branch || "main";
};

export const handleRepoSubmit = async (req, res) => {
  const {
    githubUrl,
    branch: userBranch,
    subdirectory = "",
    envContent = "",
  } = req.body;

  if (!githubUrl) {
    return res.render("form", { error: "GitHub URL is required" });
  }

  const repoName = githubUrl.split("/").pop().replace(".git", "");
  const tempPath = path.join("./cloned_repos", repoName);

  // Extract owner and repo from URL
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(\.git)?$/);
  if (!match) {
    return res.render("form", { error: "Invalid GitHub URL format" });
  }
  const owner = match[1];
  const repo = match[2];

  try {
    const branch = userBranch || (await getDefaultBranch(owner, repo));

    if(process.env.NODE_ENV === "production") {
    await cloneRepo(githubUrl, tempPath, branch);
    }

    // Adjust for subdirectory (if any)
    const finalPath = subdirectory
      ? path.join(tempPath, subdirectory)
      : tempPath;
    console.log(`Cloned repo to: ${finalPath}`);
    const stack = detectStack(finalPath);
    
    if (stack === "Vite") {
        return res.render("form", { error: "Vite apps are not supported yet." });
    }
    try{
         const path = finalPath;
  const existingSite = await RepoWebsite.findOne({ clonedpath: path });
    if (existingSite) {
      console.log(`Site already exists in MongoDB: ${existingSite.url}`);
      const port = existingSite.port;
        return res.render("result", {
        repo: githubUrl,
      stack,
      startLogs: false,
      encodedRepo: encodeURIComponent(githubUrl),
      port,
      subdirectory: subdirectory,
      existingSite: true,
      url: existingSite.url,
         });
    } else {
      console.log(`No existing site found for path: ${path}`);
    }
    }
    catch (err) {
        console.error(`Error checking subdirectory: ${err.message}`);
    }
    const port = generatePORT();
    
    if (stack === "Node.js") {
      addEnvFile(finalPath, envContent);
      addNodeDockerfile(finalPath, detectEntryFile(finalPath));
      addNodeDockerComposefile(
        port,
        detectIndexFilePORT(finalPath + "/" + detectEntryFile(finalPath)),
        finalPath
      );
    }

    if (stack === "React") {
      addDockerfile(finalPath);
      addDockerComposefile(port, finalPath);
      addEnvFile(finalPath, envContent);
    }

    res.render("result", {
      repo: githubUrl,
      stack,
      startLogs: false,
      encodedRepo: encodeURIComponent(githubUrl),
      port,
        existingSite: false,
      subdirectory: subdirectory,
    });
  } catch (err) {
    console.error(err);
    res.render("form", { error: "Failed to detect stack or clone repo." });
  }
};

import { execSync, spawn } from "child_process";
import RepoWebsite from "../models/repoWebsites.js";
import { url } from "inspector";

export const handleContainerization = async (req, res) => {
  const { repo, stack, subdomain, port, subdirectory,existingSite,url } = req.body;
  if (!repo || !subdomain)
    return res.status(400).send("❌ Repo and subdomain required.");
  console.log(
    `Received repo: ${repo}, stack: ${stack}, subdomain: ${subdomain}, port: ${port}, subdirectory: ${subdirectory}`
  );

  const subdomainSafe = subdomain.replace(/[^a-zA-Z0-9\-]/g, "");
  const confPath = `/etc/nginx/sites-available/${subdomainSafe}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${subdomainSafe}.conf`;

  // Check if subdomain is already in use
  if (fs.existsSync(enabledPath)) {
    return res.render("result", {
      repo,
      stack,
      startLogs: false,
      subdomain: subdomainSafe,
      port,
      existingSite,
      encodedRepo: encodeURIComponent(repo),
        url: url,
      subdirectory: subdirectory,
      error: "Subdomain already in use. Please choose another.",
    });
  }
  // Render result.ejs with logs
  res.render("result", {
    repo,
    stack,
    startLogs: true,
    subdomain: subdomainSafe,
    port,
    existingSite,
    subdirectory: subdirectory,
    url: url,
    encodedRepo: encodeURIComponent(repo),
  });
};
export const handleDeploymentLogs = (ws, req) => {
  const urlParams = new URLSearchParams(req.url.replace("/?", ""));
  const repo = urlParams.get("repo");
  const subdomainSafe = urlParams.get("subdomainSafe");
  const port = urlParams.get("port");
  const subdirectory = urlParams.get("subdirectory");
    const existingSite = urlParams.get("existingSite") === "true";
  if (!repo || !subdomainSafe || !port) {
    ws.send("❌ Missing parameters");
    ws.close();
    return;
  } 

  const repoName = repo.split("/").pop().replace(".git", "");
  var tempPath = path.join("./cloned_repos", repoName);
  tempPath = subdirectory ? path.join(tempPath, subdirectory) : tempPath;
  console.log(`Subdirectory: ${subdirectory}`);
  console.log(`Starting deployment for repo: ${repoName} at path: ${tempPath}`);
  const composePath = path.join(tempPath, "docker-compose.yml");

  const build = spawn("docker", ["compose", "-f", composePath, "build"]);

  ws.send(`\n`);
  const output = execSync(
    "curl -s http://ip-api.com/line/?fields=city,regionName,country"
  );
  const location = output.toString().trim().split("\n").join(", ");
  ws.send(`Server location: ${location}\n`);
  const stepTimers = new Map();
  build.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
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
  build.stderr.on("data", (data) => ws.send(data.toString()));

  build.on("close", (code) => {
    if (code !== 0) {
      ws.send(`❌ Build failed with exit code ${code}`);
      ws.close();
      return;
    }

    const run = spawn("docker", ["compose", "-f", composePath, "up", "-d"]);

    const stepTimers = new Map();
    build.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
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

    run.stderr.on("data", (data) => ws.send(data.toString()));

    run.on("close", () => {

        if(existingSite) {
        //if site already exists just update the port in the nginx config
        const subDomain=url.split(".")[0];
          const confPath = `/etc/nginx/sites-available/${subDomain}.conf`;
          const enabledPath = `/etc/nginx/sites-enabled/${subDomain}.conf`;
            const confContent = fs.readFileSync(confPath, 'utf-8');
            const updatedContent = confContent.replace(/proxy_pass http:\/\/localhost:\d+;/, `proxy_pass http://localhost:${port};`);
            fs.writeFileSync(confPath, updatedContent);
            fs.writeFileSync(enabledPath, updatedContent);
            execSync("sudo nginx -s reload");
          ws.send(`✅ Deployment successful! Site already exists.`);
          ws.send(`nginx-ready:${subdomainSafe}.voomly.xyz`);
          ws.close();
          return;
        }
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

        execSync("sudo nginx -s reload");
        execSync(`sudo certbot --nginx -d ${subdomainSafe}.voomly.xyz`);

        ws.send(`nginx-ready:${subdomainSafe}.voomly.xyz`);
        ws.send(
          `All done! Your app is now live at http://${subdomainSafe}.voomly.xyz`
        );
        try {
          (async () => {
            const site = new RepoWebsite({
              clonedpath: tempPath,
              url: `${subdomainSafe}.voomly.xyz`,
            port: port,
            });

            await site.save();
            console.log(`✅ Site saved to MongoDB: ${site.url}`);
          })();
        } catch (dbErr) {
          console.error(`❌ Failed to save site to MongoDB:`, dbErr);
        }
      } catch (err) {
        ws.send(`❌ Failed to configure NGINX: ${err.message}`);
      }
      ws.close();
    });
  });
};
