# Voomy - One-Click App Deployer
You can access it here  **[https://voomly.xyz](https://voomly.xyz)**

##  What We Built

A fully automated deployment platform that:
- Clones a given GitHub repo
- Builds Docker containers
- Spins up the app with `docker compose`
- Automatically configures NGINX with subdomain routing
- Issues SSL certificates using Certbot
- Streams real-time logs to the browser via WebSocket
- Cleans up unused images via cron

##  Technologies Used

### Backend
- **Node.js** (Express + WebSocket)
- **Docker & Docker Compose**
- **NGINX**
- **Certbot (Let's Encrypt)** for SSL for http to https
- **PM2** for process management
- **Postfix** + Gmail SMTP relay (for mail delivery)
- **cron** jobs (daily Docker cleanup)

###  Frontend
- **EJS** templating engine
- Plain **HTML/CSS** + Vanilla JS (yes, we kept it raw)
- **WebSocket** for real-time build logs

### Infrastructure
- **Ubuntu Linux 24.04.2 LTS** VPS from Microsoft azure
- **Custom bash scripts** to clean Docker images
- Dynamic NGINX config file generation
- Let's Encrypt automation
- SSL certificates updated live per subdomain
- Hostname-to-container port mapping with minimal config

##  Features Working

- Clone public GitHub repos  
- Real-time WebSocket log streaming  
- Dynamic port + subdomain allocation  
- Docker build step tracking with timestamps  
- NGINX live configuration and reload  
- SSL certificate generation with Certbot  
- Support for both `npm` and `vite` projects  
- Automatic cleanup of unused Docker images via `cron`  
- Server location detection (GeoIP)  
- Email alerts (through Gmail SMTP relay)

##  Summary

We fixed:
- SSE that didn't stream
- WebSocket closures
- SSL cert permissions
- Postfix mail configs (and `port 25` being blocked)
- `ERR_OSSL_EVP_UNSUPPORTED` in Node v18 builds
- Hanging `vite build` processes that killed SSH
- Crontab permissions, logs not working, jobs not running
- Dynamic log formatting and timestamping
- Docker image GC without killing live containers

We tweaked:
- NGINX conf paths
- Docker cleanup scripts
- Shell scripts for automated image deletion
- WebSocket formatting and lifecycle management

