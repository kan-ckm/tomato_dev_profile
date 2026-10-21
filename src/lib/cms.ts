import { ProjectItem, ProjectBadgeType, ProjectGlowVariant } from "@/types";
import { projectsConfig } from "@/config/projects.config";

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
