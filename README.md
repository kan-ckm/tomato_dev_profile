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

## Music Synchronization & Cloud Storage

Automated CLI tools to download, tag, optimize, and stream music via Cloudflare R2:

```bash
# Download any single song from YouTube, Spotify, SoundCloud, or search query
npm run music:add "https://www.youtube.com/watch?v=..."
npm run music:add "https://open.spotify.com/track/..."
npm run music:add "https://soundcloud.com/artist/track"
npm run music:add "Artist - Song Name"

# Sync full playlists
npm run soundcloud:sync "https://soundcloud.com/artist/sets/playlist"
npm run spotify:sync <playlist_id>

# Slice tracks from YouTube Breakcore Mix
npm run breakcore:sync

# Optimize all audio (MP3 VBR 2, 44.1kHz) & embedded artwork (MJPEG) for instant web streaming
npm run music:optimize

# Upload local MP3s & covers from public/assets/music to Cloudflare R2
npm run r2:upload
```

### Music Player Features & Playlist Management

- **Drag & Drop Reordering**: Reorder songs on Desktop & Mobile with smooth grab-handle dragging and instant persistence to `localStorage`.
- **Shuffle & Repeat**: Toggle random track shuffle or cycle repeat modes (`all` ➔ `one` ➔ `off`).
- **Strict 70-Track Maximum Limit**: All sync and download tools enforce a strict 70-track limit with explicit deletion warnings (`⚠️ Cần xóa bớt bài khác trong thư viện để có thể thêm bài mới`).
- **Admin Dashboard API**: `POST /api/music/reorder` allows custom Admin Dashboards to drag-and-drop update the live playlist order and immediately synchronize Cloudflare R2 / Redis cache.

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
