import { ProjectItem, ProjectBadgeType, ProjectGlowVariant, MusicTrack, BioLink } from "@/types";
import { projectsConfig } from "@/config/projects.config";
import { bioLinks as fallbackBioLinks } from "@/config/links.config";
import { mediaBlockConfig as fallbackMediaConfig, MediaBlockConfig } from "@/config/media.config";
import {
  getCachedBioLinks,
  setCachedBioLinks,
  getCachedMediaShowcase,
  setCachedMediaShowcase,
} from "./redis";
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

/**
 * Lấy danh sách Bio Links tối ưu:
 * - Ưu tiên 1: Neon PostgreSQL Database (Single Source of Truth, cập nhật tức thì)
 * - Ưu tiên 2: L1 RAM / L2 Redis Cache (Dự phòng Zero-Downtime)
 * - Ưu tiên 3: Fallback tĩnh
 */
export async function getBioLinks(): Promise<BioLink[]> {
  // 1. Truy vấn trực tiếp Neon PostgreSQL Database
  if (env.database.isConfigured) {
    try {
      const sql = neon(env.database.url);
      const rows = await sql`
        SELECT id, title, slug, payload, sort_order
        FROM content_items
        WHERE collection_slug = 'bio_links' AND status = 'published'
        ORDER BY sort_order ASC, created_at ASC
      `;

      if (rows && rows.length > 0) {
        const links: BioLink[] = rows.map((r) => {
          const p = (r.payload as Record<string, unknown>) || {};
          return {
            id: String(r.id),
            title: String(p.title || r.title),
            subtitle: String(p.subtitle || ""),
            url: String(p.url || "#"),
            iconSrc: String(p.icon_src || "/assets/link/lilith.png"),
            iconBg: String(p.icon_bg || "linear-gradient(135deg,#1a1a2e,#16213e)"),
            fallbackSvg: (p.fallback_svg as "twitter" | "discord" | "github") || "discord",
          };
        });

        // Cập nhật lại vào L1 + L2 Redis cho mục đích dự phòng
        setCachedBioLinks(links).catch(() => {});
        return links;
      }
    } catch (dbErr) {
      console.warn("[CMS] Direct DB query for bio_links failed, trying cache:", dbErr);
    }
  }

  // 2. Dự phòng: Kiểm tra L1 RAM / L2 Redis Cache
  try {
    const cached = await getCachedBioLinks();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch (err) {
    console.warn("[CMS] Redis bioLinks cache read error:", err);
  }

  // 3. Fallback về cấu hình tĩnh (Không cache cấu hình tĩnh vào Redis để tránh bẫy cache)
  return fallbackBioLinks;
}

/**
 * Lấy cấu hình Media Showcase (GIF/Video):
 * - Ưu tiên 1: Neon PostgreSQL Database (Single Source of Truth, cập nhật tức thì từ Admin Dash)
 * - Ưu tiên 2: L1 RAM / L2 Redis Cache (Dự phòng Zero-Downtime)
 * - Ưu tiên 3: Fallback tĩnh
 */
export async function getMediaShowcaseConfig(): Promise<MediaBlockConfig> {
  // 1. Truy vấn trực tiếp Neon PostgreSQL Database
  if (env.database.isConfigured) {
    try {
      const sql = neon(env.database.url);
      const rows = await sql`
        SELECT id, title, slug, payload
        FROM content_items
        WHERE collection_slug = 'media_showcase' AND status = 'published'
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `;

      if (rows && rows.length > 0) {
        const p = (rows[0].payload as Record<string, unknown>) || {};
        const config: MediaBlockConfig = {
          src: String(p.src || fallbackMediaConfig.src),
          type: (p.type as "auto" | "video" | "gif") || "auto",
          title: p.title !== undefined ? String(p.title) : fallbackMediaConfig.title,
          subtitle: p.subtitle !== undefined ? String(p.subtitle) : fallbackMediaConfig.subtitle,
          linkUrl: p.link_url !== undefined ? String(p.link_url) : fallbackMediaConfig.linkUrl,
          aspectRatio: (p.aspect_ratio as "16/9" | "4/3" | "1/1" | "auto") || "16/9",
          autoPlay: p.auto_play !== undefined ? Boolean(p.auto_play) : true,
          loop: p.loop !== undefined ? Boolean(p.loop) : true,
        };

        // Lưu cấu hình mới nhất vào Redis dự phòng
        setCachedMediaShowcase(config).catch(() => {});
        return config;
      }
    } catch (dbErr) {
      console.warn("[CMS] Direct DB query for media_showcase failed, trying cache:", dbErr);
    }
  }

  // 2. Dự phòng: Kiểm tra L1 RAM / L2 Redis Cache
  try {
    const cached = await getCachedMediaShowcase();
    if (cached && typeof cached === "object" && cached.src) {
      return cached;
    }
  } catch (err) {
    console.warn("[CMS] Redis mediaShowcase cache read error:", err);
  }

  // 3. Fallback cuối cùng về cấu hình tĩnh (Không cache cấu hình tĩnh vào Redis để tránh bẫy cache)
  return fallbackMediaConfig;
}
