import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/security";
import { setCachedMusicPlaylist, invalidateMusicPlaylistCache } from "@/lib/redis";
import { env } from "@/lib/env";
import { neon } from "@neondatabase/serverless";
import { MusicTrack } from "@/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * POST /api/music/reorder
 * Cập nhật thứ tự phát của danh sách nhạc vào Neon PostgreSQL Database (Single Source of Truth).
 * Không còn phụ thuộc vào thư mục file nội bộ trên máy chủ.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json().catch(() => null);
    const orderInput = body?.order || body?.tracks || body?.items;
    if (!body || !Array.isArray(orderInput)) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ. Cần truyền mảng 'order' hoặc 'tracks' chứa tên file bài hát." },
        { status: 400, headers: corsHeaders }
      );
    }

    const order: string[] = orderInput.map((item) => (typeof item === "string" ? item : item.file || ""));

    // 1. Cập nhật thứ tự trực tiếp vào Neon SQL Database nếu có kết nối
    if (env.database.isConfigured) {
      try {
        const sql = neon(env.database.url);
        for (let i = 0; i < order.length; i++) {
          const filename = order[i];
          if (!filename) continue;
          const r2Key = `music/${filename}`;
          await sql`
            UPDATE music_tracks
            SET sort_order = ${i + 1}, updated_at = NOW()
            WHERE r2_key = ${r2Key} OR r2_key LIKE ${`%/${filename}`}
          `;
        }

        // Lấy lại danh sách mới nhất đã sắp xếp
        const rows = await sql`
          SELECT id, title, artist, r2_key, audio_url, cover_url, sort_order
          FROM music_tracks
          WHERE is_active = true
          ORDER BY sort_order ASC, created_at ASC
        `;

        const updatedTracks: MusicTrack[] = rows.map((r) => {
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

        await setCachedMusicPlaylist(updatedTracks);
        await invalidateMusicPlaylistCache();

        // Đồng bộ file fallback music.config.ts ngay lập tức
        try {
          const fs = await import("fs");
          const path = await import("path");
          const configPath = path.join(process.cwd(), "src", "config", "music.config.ts");
          if (fs.existsSync(configPath) && updatedTracks.length > 0) {
            const playlistItems = updatedTracks.map((t) => {
              return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    url: ${JSON.stringify(t.url || "")},\n    cover: ${JSON.stringify(t.cover || "")},\n  },`;
            });
            const content = `import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = ${JSON.stringify(updatedTracks[0].file)};
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) tự động đồng bộ từ Neon PostgreSQL Database & Cloudflare R2 CDN.
 * Không phụ thuộc vào file MP3 nội bộ trên máy chủ.
 */
export const fallbackPlaylist: MusicTrack[] = [
${playlistItems.join("\n")}
];
`;
            fs.writeFileSync(configPath, content, "utf-8");
          }
        } catch {
          // ignore
        }

        return NextResponse.json(
          {
            success: true,
            message: `Đã cập nhật thứ tự thành công cho ${updatedTracks.length} bài hát lên Neon SQL Database.`,
            count: updatedTracks.length,
            playlist: updatedTracks,
          },
          { status: 200, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
        );
      } catch (sqlErr) {
        console.warn("[API /api/music/reorder] Neon direct update failed, forwarding to CMS:", sqlErr);
      }
    }

    // 2. Fallback: Gửi yêu cầu cập nhật sang Central Admin CMS API
    const cmsBaseUrl = process.env.CMS_API_URL || "http://127.0.0.1:3001";
    try {
      const cmsRes = await fetch(`${cmsBaseUrl.replace(/\/+$/, "")}/api/music/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: order.map((file, idx) => ({ file, sortOrder: idx + 1 })) }),
        signal: AbortSignal.timeout(5000),
      });

      if (cmsRes.ok) {
        await invalidateMusicPlaylistCache();
        const json = await cmsRes.json();
        return NextResponse.json(
          { success: true, message: "Đã cập nhật thứ tự qua Central Admin CMS.", data: json },
          { status: 200, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
        );
      }
    } catch (cmsErr) {
      console.warn("[API /api/music/reorder] CMS fallback failed:", cmsErr);
    }

    await invalidateMusicPlaylistCache();
    return NextResponse.json(
      { success: true, message: "Đã làm mới cache thứ tự bài hát." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[API /api/music/reorder] Lỗi máy chủ:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật thứ tự playlist." },
      { status: 500, headers: corsHeaders }
    );
  }
}
