import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = "wave to earth - love..mp3";
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) khi API /api/music chưa phản hồi.
 * Khi chạy thực tế, API /api/music sẽ tự động đọc từ Cloudflare R2 hoặc quét `public/assets/music`.
 */
export const fallbackPlaylist: MusicTrack[] = [
  { name: "love.", artist: "wave to earth", file: "wave to earth - love..mp3" },
  { name: "Magnolia", artist: "Laufey", file: "Laufey - Magnolia.mp3" },
  { name: "daisy.", artist: "wave to earth", file: "wave to earth - daisy..mp3" },
  { name: "Valentine", artist: "Laufey", file: "Laufey - Valentine.mp3" },
  { name: "Show me how", artist: "Men I Trust", file: "Men I Trust - Show me how.mp3" },
  { name: "Kingston", artist: "Faye Webster", file: "Faye Webster - Kingston.mp3" },
];
