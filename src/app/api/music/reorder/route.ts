import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/security";
import { setCachedMusicPlaylist, invalidateMusicPlaylistCache } from "@/lib/redis";
import { parseTrackFilename } from "@/lib/music";
import { MusicTrack } from "@/types";

export const runtime = "nodejs";

const MAX_PLAYLIST_LIMIT = 70;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * POST /api/music/reorder
 * Cập nhật thứ tự phát của danh sách nhạc (phục vụ kéo-thả từ Admin Dashboard hoặc Web).
 *
 * Body format:
 *   {
 *     "order": ["file1.mp3", "file2.mp3", ...]
 *   }
 */
export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const body = await request.json().catch(() => null);
    const orderInput = body?.order || body?.tracks;
    if (!body || !Array.isArray(orderInput)) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ. Cần truyền mảng 'order' hoặc 'tracks' chứa tên file bài hát." },
        { status: 400, headers: corsHeaders }
      );
    }

    const order: string[] = orderInput;

    // Kiểm tra giới hạn 70 bài hát
    if (order.length > MAX_PLAYLIST_LIMIT) {
      console.warn(
        `[API /api/music/reorder] Danh sách (${order.length} bài) vượt quá giới hạn tối đa ${MAX_PLAYLIST_LIMIT} bài!`
      );
      return NextResponse.json(
        {
          error: `Thư viện đã đạt giới hạn tối đa ${MAX_PLAYLIST_LIMIT} bài hát (${order.length}/${MAX_PLAYLIST_LIMIT}). Cần xóa bớt bài khác trong thư viện để cập nhật.`,
          maxLimit: MAX_PLAYLIST_LIMIT,
          currentCount: order.length,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const publicMusicDir = path.join(process.cwd(), "public", "assets", "music");
    const coversDir = path.join(publicMusicDir, "covers");

    if (!fs.existsSync(publicMusicDir)) {
      return NextResponse.json(
        { error: "Thư mục nhạc không tồn tại trên hệ thống." },
        { status: 500, headers: corsHeaders }
      );
    }

    const existingFiles = fs
      .readdirSync(publicMusicDir)
      .filter((f) => f.toLowerCase().endsWith(".mp3"));

    // Tạo map các file hiện có
    const fileMap = new Map<string, MusicTrack>();
    for (const file of existingFiles) {
      const { name, artist, baseFilename } = parseTrackFilename(file);
      const coverPath = path.join(coversDir, `${baseFilename}.jpg`);
      const hasCover = fs.existsSync(coverPath);
      fileMap.set(file.toLowerCase(), {
        name,
        artist,
        file,
        cover: hasCover
          ? `/assets/music/covers/${encodeURIComponent(baseFilename)}.jpg`
          : undefined,
      });
    }

    // Xây dựng danh sách bài theo đúng thứ tự order truyền vào
    const reorderedTracks: MusicTrack[] = [];
    const addedFiles = new Set<string>();

    for (const requestedFile of order) {
      const lower = requestedFile.toLowerCase().trim();
      if (fileMap.has(lower) && !addedFiles.has(lower)) {
        reorderedTracks.push(fileMap.get(lower)!);
        addedFiles.add(lower);
      }
    }

    // Nếu có file tồn tại nhưng chưa có trong mảng order, bổ sung vào cuối
    for (const [lower, track] of fileMap.entries()) {
      if (!addedFiles.has(lower)) {
        reorderedTracks.push(track);
        addedFiles.add(lower);
      }
    }

    if (reorderedTracks.length > MAX_PLAYLIST_LIMIT) {
      return NextResponse.json(
        {
          error: `Tổng số bài hát (${reorderedTracks.length}) vượt quá giới hạn ${MAX_PLAYLIST_LIMIT} bài. Cần xóa bớt bài trước.`,
          maxLimit: MAX_PLAYLIST_LIMIT,
          currentCount: reorderedTracks.length,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Ghi thứ tự mới vào src/config/music.config.ts
    const configPath = path.join(
      process.cwd(),
      "src",
      "config",
      "music.config.ts"
    );
    const defaultTrack = reorderedTracks[0];
    const playlistItems = reorderedTracks.map((t) => {
      const coverUrl =
        t.cover ||
        `/assets/music/covers/${encodeURIComponent(
          t.file.replace(/\.mp3$/i, "")
        )}.jpg`;
      return `  {\n    name: ${JSON.stringify(t.name)},\n    artist: ${JSON.stringify(t.artist)},\n    file: ${JSON.stringify(t.file)},\n    cover: ${JSON.stringify(coverUrl)},\n  },`;
    });

    const content = `import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = ${JSON.stringify(defaultTrack.file)};
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) khi API /api/music chưa phản hồi.
 * Khi chạy thực tế, API /api/music sẽ tự động đọc từ Cloudflare R2 hoặc quét \`public/assets/music\`.
 */
export const fallbackPlaylist: MusicTrack[] = [
${playlistItems.join("\n")}
];
`;

    fs.writeFileSync(configPath, content, "utf-8");

    // 2. Cập nhật Redis Cache ngay lập tức
    await setCachedMusicPlaylist(reorderedTracks);
    await invalidateMusicPlaylistCache();

    console.log(
      `[API /api/music/reorder] ✅ Đã cập nhật thành công thứ tự ${reorderedTracks.length} bài hát.`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Đã cập nhật thứ tự thành công cho ${reorderedTracks.length} bài hát.`,
        count: reorderedTracks.length,
        maxLimit: MAX_PLAYLIST_LIMIT,
        playlist: reorderedTracks,
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[API /api/music/reorder] Lỗi máy chủ:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật thứ tự playlist." },
      { status: 500, headers: corsHeaders }
    );
  }
}
