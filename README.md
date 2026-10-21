# TomatoDevs Profile

Personal portfolio, bio links, project showcase, and interactive 3D Armillary Sphere built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

Live: [tomatodev.me](https://tomatodev.me)

---

## Tech Stack

- **Framework**: Next.js 15 (Standalone output), React 19, TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js (WebGL, Custom GLSL Shaders)
- **State & Audio**: React Context (`MusicPlayerContext`), persistent across navigation
- **Cache & Database**: Redis (AOF + LRU) via `@upstash/redis` with fallback
- **Storage**: Cloudflare R2 (audio streaming & artworks)
- **Deployment**: Docker Compose, Nginx Reverse Proxy, Cloudflare Zero-Trust Tunnel

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` (all variables have safe fallbacks for local dev):

```bash
cp .env.example .env.local
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build and run production

```bash
npm run build
npm run start
```

---

## Docker & Homelab Deployment

### Local Docker Stack

```bash
# Start Redis & Redis HTTP proxy
npm run redis:up

# Check status
npm run redis:status
```

### Homelab Operations

The project includes automation scripts to deploy and update the stack on a remote Homelab server:

```bash
# Deploy full stack to Homelab (Next.js, Nginx, Redis, Tunnel)
npm run homelab:up

# Quick-sync static assets (music, images) without rebuilding Docker image
npm run homelab:sync

# Connect Cloudflare Zero-Trust Tunnel
npm run homelab:tunnel -- <TUNNEL_TOKEN>

# Check service status & logs
npm run homelab:status
npm run homelab:logs
```

---

## Project Structure

```text
├── docker/              # Nginx reverse proxy configuration
├── public/assets/       # Static assets (images, music MP3s, icons)
├── scripts/             # Local and Homelab management scripts
├── src/
│   ├── app/             # Next.js App Router (pages and API routes)
│   ├── components/      # UI components (player, 3D sphere, showcase)
│   ├── config/          # Data configuration (profile, links, projects, music)
│   ├── lib/             # Utilities (Redis client, security headers, rate limit)
│   └── types/           # TypeScript type definitions
├── docker-compose.yml   # Multi-service container orchestration
└── Dockerfile           # Multi-stage optimized standalone build
```

---

## License

MIT © [TomatoDevs](https://github.com/TomatoDevs)
