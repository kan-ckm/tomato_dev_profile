import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaylist } from "@/config/music.config";
import {
  checkRateLimit,
  getCorsHeaders,
  isSafeMp3Filename,
} from "@/lib/security";
import { isR2Configured, listR2Objects, getR2PublicUrl } from "@/lib/r2";
import {
  REDIS_KEYS,
  acquireDistributedLock,
  getCachedMusicPlaylist,
  setCachedMusicPlaylist,
} from "@/lib/redis";
import { parseTrackFilename, sortTracksByConfigOrder } from "@/lib/music";
import { getMusicPlaylistFromDatabase, getMusicPlaylistFromCms } from "@/lib/cms";
import { MusicTrack } from "@/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/music
 * Trả về danh sách các bản nhạc MP3:
 * 1. Đọc từ Redis Cache (L1 RAM + L2 Docker/Upstash Redis) — Phản hồi < 1ms
 * 2. Hoặc lấy từ Cloudflare R2 Storage (và tự động lưu vào Redis Cache 10 phút)
 * 3. Hoặc quét thư mục `public/assets/music` cục bộ
 *
 * Bảo mật & Chống sập:
 * - Chống Path Traversal và lọc chặt định dạng .mp3
 * - Bảo vệ tham số ?refresh=1 bằng Rate Limit riêng + Distributed Lock chống spam S3/R2
 * - Không bao giờ làm lộ đường dẫn hệ thống nội bộ (process.cwd()) khi có sự cố
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const rateLimit = checkRateLimit(request, 60, 60_000, "api-music");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: corsHeaders }
    );
  }

  let forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  // Bảo vệ cờ ?refresh=1 chống spam
  if (forceRefresh) {
    const refreshLimit = checkRateLimit(request, 4, 60_000, "api-music-refresh");
    const hasLock = refreshLimit.allowed
      ? await acquireDistributedLock(REDIS_KEYS.MUSIC_LOCK, 10)
      : false;
    if (!hasLock) {
      forceRefresh = false;
    }
  }

  // ============================================================================
  // 1. NGUỒN CHÍNH (PRIMARY): Truy vấn Neon PostgreSQL Database trực tiếp
  // ============================================================================
  try {
    const dbTracks = await getMusicPlaylistFromDatabase();
    if (dbTracks && dbTracks.length > 0) {
      // Lưu làm bản sao dự phòng vào Redis
      await setCachedMusicPlaylist(dbTracks);

      return NextResponse.json(dbTracks, {
        status: 200,
        headers: {
          ...corsHeaders,
          "X-Source": "Neon-SQL-Direct",
          "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=30",
        },
      });
    }
  } catch (dbErr) {
    console.warn("[API /api/music] Direct Neon DB query failed, attempting CMS fallback:", dbErr);
  }

  // ============================================================================
  // 2. NGUỒN PHỤ (SECONDARY): Central Admin CMS API (Headless Endpoint)
  // ============================================================================
  try {
    const cmsTracks = await getMusicPlaylistFromCms();
    if (cmsTracks && cmsTracks.length > 0) {
      // Lưu làm bản sao dự phòng vào Redis
      await setCachedMusicPlaylist(cmsTracks);

      return NextResponse.json(cmsTracks, {
        status: 200,
        headers: {
          ...corsHeaders,
          "X-Source": "Neon-SQL-CMS",
          "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=30",
        },
      });
    }
  } catch (cmsErr) {
    console.warn("[API /api/music] Central CMS query failed, attempting offline fallbacks:", cmsErr);
  }

  // ============================================================================
  // 3. DỰ PHÒNG KHI MẤT MẠNG (OFFLINE FALLBACKS): Redis -> R2 -> Local Files
  // ============================================================================
  // Fallback A: Redis Cache
  if (!forceRefresh) {
    try {
      const cachedTracks = await getCachedMusicPlaylist();
      if (cachedTracks && cachedTracks.length > 0) {
        return NextResponse.json(cachedTracks, {
          status: 200,
          headers: {
            ...corsHeaders,
            "X-Cache": "HIT",
            "X-Source": "Redis-Offline-Fallback",
            "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        });
      }
    } catch (redisErr) {
      console.warn("[API /api/music] Redis fallback failed:", redisErr);
    }
  }

  // Fallback B: Quét Cloudflare R2 Bucket
  if (isR2Configured()) {
    try {
      let r2Objects = await listR2Objects("music/");
      if (!r2Objects || r2Objects.length === 0) {
        r2Objects = await listR2Objects("");
      }

      const mp3Objects = (r2Objects || []).filter((obj) => {
        if (!obj.Key) return false;
        const filename = obj.Key.split("/").pop() || "";
        return isSafeMp3Filename(filename);
      });

      if (mp3Objects.length > 0) {
        const rawTracks: MusicTrack[] = mp3Objects.map((obj) => {
          const key = obj.Key!;
          const filename = key.split("/").pop() || key;
          const { name, artist, baseFilename } = parseTrackFilename(filename);

          return {
            name,
            artist,
            file: filename,
            url: getR2PublicUrl(key),
            size: obj.Size,
            cover: getR2PublicUrl(`music/covers/${baseFilename}.jpg`),
          };
        });

        const sortedR2Tracks = sortTracksByConfigOrder(rawTracks);
        await setCachedMusicPlaylist(sortedR2Tracks);

        return NextResponse.json(sortedR2Tracks, {
          status: 200,
          headers: {
            ...corsHeaders,
            "X-Source": "Cloudflare-R2-Fallback",
            "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        });
      }
    } catch (r2Error) {
      console.warn("[API /api/music] Cloudflare R2 query failed:", r2Error);
    }
  }

  // Fallback C: Quét thư mục tĩnh cục bộ public/assets/music nếu có
  try {
    const fs = await import("fs");
    const path = await import("path");
    const publicMusicDir = path.join(process.cwd(), "public", "assets", "music");
    const legacyMusicDir = path.join(process.cwd(), "assets", "music");

    const musicDir = fs.existsSync(publicMusicDir)
      ? publicMusicDir
      : fs.existsSync(legacyMusicDir)
      ? legacyMusicDir
      : null;

    if (musicDir) {
      const files = fs.readdirSync(musicDir);
      const musicFiles: MusicTrack[] = files
        .filter(isSafeMp3Filename)
        .map((file) => {
          const { name, artist, baseFilename } = parseTrackFilename(file);
          const localCoverPath = path.join(publicMusicDir, "covers", `${baseFilename}.jpg`);
          const cover = fs.existsSync(localCoverPath)
            ? `/assets/music/covers/${encodeURIComponent(baseFilename)}.jpg`
            : undefined;

          return {
            name,
            artist,
            file,
            cover,
          };
        });

      if (musicFiles.length > 0) {
        const sortedLocalTracks = sortTracksByConfigOrder(musicFiles);
        return NextResponse.json(sortedLocalTracks, {
          status: 200,
          headers: {
            ...corsHeaders,
            "X-Source": "Local-Disk-Fallback",
            "Cache-Control": "public, s-maxage=3600",
          },
        });
      }
    }
  } catch {
    // ignore
  }

  // Fallback D: fallbackPlaylist chuẩn trong config
  return NextResponse.json(fallbackPlaylist, {
    status: 200,
    headers: {
      ...corsHeaders,
      "X-Source": "Static-Config-Fallback",
      "Cache-Control": "public, s-maxage=600",
    },
  });
}
