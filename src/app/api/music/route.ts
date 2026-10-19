import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaylist } from "@/config/music.config";
import { checkRateLimit, isSafeMp3Filename } from "@/lib/security";
import { MusicTrack } from "@/types";

/**
 * GET /api/music
 * Quét thư mục `public/assets/music` để trả về danh sách các bản nhạc MP3.
 * Bảo mật:
 * - Chống Path Traversal và lọc chặt định dạng .mp3
 * - Không bao giờ làm lộ đường dẫn hệ thống (process.cwd()) khi xảy ra lỗi
 * - Hỗ trợ Rate Limiting và Cache-Control tối ưu
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const publicMusicDir = path.join(process.cwd(), "public", "assets", "music");
    const legacyMusicDir = path.join(process.cwd(), "assets", "music");

    const musicDir = fs.existsSync(publicMusicDir)
      ? publicMusicDir
      : fs.existsSync(legacyMusicDir)
      ? legacyMusicDir
      : null;

    if (!musicDir) {
      // Trả về danh sách dự phòng thay vì làm lộ đường dẫn server nội bộ
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
