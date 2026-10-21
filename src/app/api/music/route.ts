import fs from "fs";
import path from "path";
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
import { MusicTrack } from "@/types";

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

  // Bảo vệ nghiêm ngặt cờ ?refresh=1 để tránh kẻ xấu spam S3 ListObjectsV2 (Class A Operation)
  if (forceRefresh) {
    const refreshLimit = checkRateLimit(request, 2, 60_000, "api-music-refresh");
    const hasLock = refreshLimit.allowed
      ? await acquireDistributedLock(REDIS_KEYS.MUSIC_LOCK, 15)
      : false;
    if (!hasLock) {
      forceRefresh = false;
    }
  }

  // 1. Kiểm tra Redis Cache trước tiên (giảm 99.9% số lần gọi S3 ListObjectsV2 lên Cloudflare R2)
  if (!forceRefresh) {
    const cachedTracks = await getCachedMusicPlaylist();
    if (cachedTracks && cachedTracks.length > 0) {
      return NextResponse.json(cachedTracks, {
        status: 200,
        headers: {
          ...corsHeaders,
          "X-Cache": "HIT",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }
  }

  // 2. Kiểm tra Cloudflare R2 Storage (nếu chưa có trong Redis Cache)
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

        // Lưu danh sách nhạc R2 vào Redis Cache (10 phút)
        await setCachedMusicPlaylist(sortedR2Tracks);

        return NextResponse.json(sortedR2Tracks, {
          status: 200,
          headers: {
            ...corsHeaders,
            "X-Cache": "MISS",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch (r2Error) {
      console.warn(
        "[API /api/music] Cloudflare R2 query failed, falling back to local files:",
        r2Error
      );
    }
  }

  // 3. Quét thư mục tĩnh cục bộ public/assets/music nếu chưa có R2
  try {
    const publicMusicDir = path.join(process.cwd(), "public", "assets", "music");
    const legacyMusicDir = path.join(process.cwd(), "assets", "music");

    const musicDir = fs.existsSync(publicMusicDir)
      ? publicMusicDir
      : fs.existsSync(legacyMusicDir)
      ? legacyMusicDir
      : null;

    if (!musicDir) {
      return NextResponse.json(fallbackPlaylist, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    const files = fs.readdirSync(musicDir);

    const musicFiles: MusicTrack[] = files
      .filter(isSafeMp3Filename)
      .map((file) => {
        const { name, artist, baseFilename } = parseTrackFilename(file);
        const localCoverPath = path.join(
          publicMusicDir,
          "covers",
          `${baseFilename}.jpg`
        );
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

    const sortedLocalTracks =
      musicFiles.length > 0
        ? sortTracksByConfigOrder(musicFiles)
        : fallbackPlaylist;

    await setCachedMusicPlaylist(sortedLocalTracks);

    return NextResponse.json(sortedLocalTracks, {
      status: 200,
      headers: {
        ...corsHeaders,
        "X-Cache": "LOCAL",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[API /api/music] Internal error:", error);
    return NextResponse.json(fallbackPlaylist, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=600",
      },
    });
  }
}
