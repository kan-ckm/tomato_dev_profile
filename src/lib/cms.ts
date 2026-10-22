import { ProjectItem, ProjectBadgeType, ProjectGlowVariant, MusicTrack } from "@/types";
import { projectsConfig } from "@/config/projects.config";
import { neon } from "@neondatabase/serverless";
import { env } from "./env";

const CMS_BASE_URL = process.env.CMS_API_URL || "http://127.0.0.1:3001";
const PROJECT_SLUG = "tomato_dev_profile";

interface CmsItem {
  id: string;
  title: string;
  slug: string;
  payload: Record<string, unknown>;
}

interface CmsResponse {
  success: boolean;
  data: CmsItem[];
}

/**
 * Lấy danh sách dự án showcase từ Central Admin CMS (admin_dash).
 * - Sử dụng Next.js ISR (revalidate: 60s)
 * - Tự động fallback về projectsConfig tĩnh nếu CMS chưa bật hoặc lỗi mạng (Zero Downtime).
 */
export async function getShowcaseProjects(): Promise<ProjectItem[]> {
  try {
    const url = `${CMS_BASE_URL.replace(/\/+$/, "")}/api/v1/public/${PROJECT_SLUG}/content/portfolio_projects`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      return projectsConfig;
    }

    const json = (await res.json()) as CmsResponse;
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      return projectsConfig;
    }

    return json.data.map((item) => {
      const p = item.payload;
      return {
        id: String(p.id || item.id),
        title: String(p.title || item.title),
        description: String(p.description || ""),
        badgeType: (p.badge_type as ProjectBadgeType) || "web",
        badgeLabel: String(p.badge_label || "Web App"),
        glowVariant: (p.glow_variant as ProjectGlowVariant) || "web",
        iconSrc: String(p.icon_src || p.image || "/assets/project_img/register_showcase.png"),
        image: p.image ? String(p.image) : undefined,
        languages: Array.isArray(p.languages) ? p.languages.map(String) : ["TypeScript"],
        repoUrl: String(p.repo_url || "https://github.com/kan-ckm"),
        buttonLabel: String(p.button_label || "View Repository"),
      };
    });
  } catch {
    // Fallback mượt mà về dữ liệu tĩnh
    return projectsConfig;
  }
}

interface CmsMusicTrack {
  id: string;
  name: string;
  artist: string;
  file: string;
  url: string;
  cover: string;
  sortOrder: number;
}

interface CmsMusicResponse {
  success: boolean;
  total: number;
  data: CmsMusicTrack[];
}

/**
 * Lấy danh sách nhạc TRỰC TIẾP từ Cloud Neon PostgreSQL Database.
 * - Single Source of Truth, độc lập hoàn toàn với filesystem cục bộ.
 * - Trả về link Cloudflare R2 CDN toàn cầu (audio_url, cover_url) tức thì.
 */
export async function getMusicPlaylistFromDatabase(): Promise<MusicTrack[] | null> {
  if (!env.database.isConfigured) {
    return null;
  }

  try {
    const sql = neon(env.database.url);
    const rows = await sql`
      SELECT 
        id, title, artist, r2_key, audio_url, cover_url, sort_order
      FROM music_tracks
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows.map((r) => {
      const file = r.r2_key ? r.r2_key.replace(/^music\//i, "") : `${r.artist} - ${r.title}.mp3`;
      return {
        id: String(r.id),
        name: String(r.title),
        artist: String(r.artist),
        file,
        url: String(r.audio_url || ""),
        cover: String(r.cover_url || ""),
      };
    });
  } catch (err) {
    console.warn("[CMS / Database] Direct Neon SQL query failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Lấy danh sách nhạc từ Central Admin CMS (admin_dash API).
 * - Sử dụng cache: 'no-store' để luôn lấy trạng thái mới nhất tức thì.
 * - Trả về null nếu CMS không phản hồi để caller tự động fallback.
 */
export async function getMusicPlaylistFromCms(): Promise<MusicTrack[] | null> {
  try {
    const url = `${CMS_BASE_URL.replace(/\/+$/, "")}/api/v1/public/music`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as CmsMusicResponse;
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }

    return json.data.map((track) => ({
      name: track.name,
      artist: track.artist,
      file: track.file,
      url: track.url,
      cover: track.cover,
    }));
  } catch {
    return null;
  }
}
