import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaylist } from "@/config/music.config";
import { checkRateLimit, isSafeMp3Filename } from "@/lib/security";
import { isR2Configured, listR2Objects, getR2PublicUrl } from "@/lib/r2";
import { MusicTrack } from "@/types";

/**
 * GET /api/music
 * Trả về danh sách các bản nhạc MP3 từ Cloudflare R2 (nếu đã cấu hình)
 * hoặc quét thư mục `public/assets/music` cục bộ.
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

  // 1. Kiểm tra Cloudflare R2 Storage (ưu tiên hàng đầu)
  if (isR2Configured()) {
    try {
      // Tìm nhạc trong prefix "music/" hoặc ở thư mục gốc bucket
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

          return {
            name,
            artist,
            file: filename,
            url: getR2PublicUrl(key),
            size: obj.Size,
          };
        });

        return NextResponse.json(r2Tracks, {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch (r2Error) {
      console.warn("[API /api/music] Cloudflare R2 query failed, falling back to local files:", r2Error);
    }
  }

  // 2. Quét thư mục tĩnh cục bộ public/assets/music nếu chưa có R2
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

        return {
          name,
          artist,
          file,
        };
      });

    return NextResponse.json(
      musicFiles.length > 0 ? musicFiles : fallbackPlaylist,
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
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
