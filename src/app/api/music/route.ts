import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaylist } from "@/config/music.config";
import { checkRateLimit, isSafeMp3Filename } from "@/lib/security";
import { isR2Configured, listR2Objects, getR2PublicUrl } from "@/lib/r2";
import { getCachedMusicPlaylist, setCachedMusicPlaylist } from "@/lib/redis";
import { MusicTrack } from "@/types";

/**
 * GET /api/music
 * Trả về danh sách các bản nhạc MP3:
 * 1. Đọc từ Redis Cache (L1 RAM + L2 Docker/Upstash Redis) — Phản hồi < 1ms
 * 2. Hoặc lấy từ Cloudflare R2 Storage (và tự động lưu vào Redis Cache 10 phút)
 * 3. Hoặc quét thư mục `public/assets/music` cục bộ
 * 
 * Bảo mật:
 * - Chống Path Traversal và lọc chặt định dạng .mp3
 * - Không bao giờ làm lộ đường dẫn hệ thống nội bộ (process.cwd()) khi có sự cố
 * - Rate Limiting & Cache-Control tối ưu
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  // 1. Kiểm tra Redis Cache trước tiên (giảm 99.9% số lần gọi S3 ListObjectsV2 lên Cloudflare R2)
  if (!forceRefresh) {
    const cachedTracks = await getCachedMusicPlaylist();
    if (cachedTracks && cachedTracks.length > 0) {
      return NextResponse.json(cachedTracks, {
        status: 200,
        headers: {
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

      const mp3Objects = (r2Objects || []).filter(
        (obj) => obj.Key && obj.Key.toLowerCase().endsWith(".mp3")
      );

      if (mp3Objects.length > 0) {
        const r2Tracks: MusicTrack[] = mp3Objects.map((obj) => {
          const key = obj.Key!;
          const filename = key.split("/").pop() || key;
          let name = filename.replace(/\.mp3$/i, "");
          let artist = "Unknown";

          if (name.includes(" - ")) {
            const parts = name.split(" - ");
            artist = parts[0].trim();
            name = parts.slice(1).join(" - ").trim();
          } else if (name.includes(" x ")) {
            const parts = name.split(" x ");
            artist = parts[0].trim();
            name = parts.slice(1).join(" x ").trim();
          }

          const baseFilename = filename.replace(/\.mp3$/i, "");

          return {
            name,
            artist,
            file: filename,
            url: getR2PublicUrl(key),
            size: obj.Size,
            cover: getR2PublicUrl(`music/covers/${baseFilename}.jpg`),
          };
        });

        // Sắp xếp danh sách bài hát theo thứ tự mix chuẩn:
        // Đảm bảo "through the light" luôn đứng ở vị trí đầu tiên (index 0)
        const fallbackOrder = new Map(
          fallbackPlaylist.map((t, idx) => [t.file.toLowerCase(), idx])
        );
        r2Tracks.sort((a, b) => {
          const aIdx = fallbackOrder.has(a.file.toLowerCase())
            ? fallbackOrder.get(a.file.toLowerCase())!
            : 999;
          const bIdx = fallbackOrder.has(b.file.toLowerCase())
            ? fallbackOrder.get(b.file.toLowerCase())!
            : 999;
          return aIdx - bIdx;
        });

        // Lưu danh sách nhạc R2 vào Redis Cache (10 phút)
        await setCachedMusicPlaylist(r2Tracks);

        return NextResponse.json(r2Tracks, {
          status: 200,
          headers: {
            "X-Cache": "MISS",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch (r2Error) {
      console.warn("[API /api/music] Cloudflare R2 query failed, falling back to local files:", r2Error);
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
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    const files = fs
      .readdirSync(musicDir)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const fallbackOrder = new Map(
      fallbackPlaylist.map((t, idx) => [t.file.toLowerCase(), idx])
    );

    const musicFiles: MusicTrack[] = files
      .filter(isSafeMp3Filename)
      .map((file) => {
        let name = file.replace(/\.mp3$/i, "");
        let artist = "Unknown";

        if (name.includes(" - ")) {
          const parts = name.split(" - ");
          artist = parts[0].trim();
          name = parts.slice(1).join(" - ").trim();
        } else if (name.includes(" x ")) {
          const parts = name.split(" x ");
          artist = parts[0].trim();
          name = parts.slice(1).join(" x ").trim();
        }

        const baseFilename = file.replace(/\.mp3$/i, "");
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
      })
      .sort((a, b) => {
        const aIdx = fallbackOrder.has(a.file.toLowerCase())
          ? fallbackOrder.get(a.file.toLowerCase())!
          : 999;
        const bIdx = fallbackOrder.has(b.file.toLowerCase())
          ? fallbackOrder.get(b.file.toLowerCase())!
          : 999;
        return aIdx - bIdx;
      });

    const resultTracks = musicFiles.length > 0 ? musicFiles : fallbackPlaylist;
    await setCachedMusicPlaylist(resultTracks);

    return NextResponse.json(resultTracks, {
      status: 200,
      headers: {
        "X-Cache": "LOCAL",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[API /api/music] Internal error:", error);
    return NextResponse.json(fallbackPlaylist, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600",
      },
    });
  }
}
