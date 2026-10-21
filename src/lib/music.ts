import { fallbackPlaylist, DEFAULT_TRACK_FILE } from "@/config/music.config";
import { MusicTrack } from "@/types";

/**
 * Tách tên Nghệ sĩ (Artist) và Tên bài hát (Title) từ tên file .mp3
 * Hỗ trợ chuẩn định dạng "Artist - Title.mp3" và "Artist x Artist2 - Title.mp3"
 */
export function parseTrackFilename(filename: string): {
  name: string;
  artist: string;
  baseFilename: string;
} {
  const baseFilename = filename.replace(/\.mp3$/i, "").trim();
  let name = baseFilename;
  let artist = "Unknown";

  if (baseFilename.includes(" - ")) {
    const parts = baseFilename.split(" - ");
    artist = parts[0].trim();
    name = parts.slice(1).join(" - ").trim();
  } else if (baseFilename.includes(" x ")) {
    const parts = baseFilename.split(" x ");
    artist = parts[0].trim();
    name = parts.slice(1).join(" x ").trim();
  }

  return { name, artist, baseFilename };
}

/**
 * Sắp xếp danh sách bài hát theo thứ tự chuẩn trong `music.config.ts`
 * Đảm bảo bài hát mặc định (`DEFAULT_TRACK_FILE` / "through the light") luôn nằm ở vị trí đầu tiên (index 0).
 */
export function sortTracksByConfigOrder(tracks: MusicTrack[]): MusicTrack[] {
  const fallbackOrder = new Map(
    fallbackPlaylist.map((t, idx) => [t.file.toLowerCase(), idx])
  );

  return [...tracks].sort((a, b) => {
    const aFile = a.file.toLowerCase();
    const bFile = b.file.toLowerCase();

    // Ưu tiên tuyệt đối cho DEFAULT_TRACK_FILE ở vị trí 0
    if (aFile === DEFAULT_TRACK_FILE.toLowerCase()) return -1;
    if (bFile === DEFAULT_TRACK_FILE.toLowerCase()) return 1;

    const aIdx = fallbackOrder.has(aFile) ? fallbackOrder.get(aFile)! : 999;
    const bIdx = fallbackOrder.has(bFile) ? fallbackOrder.get(bFile)! : 999;

    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.file.localeCompare(b.file, undefined, { sensitivity: "base" });
  });
}
