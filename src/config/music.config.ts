import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = "dracodraco - through the light.mp3";
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) khi API /api/music chưa phản hồi.
 * Khi chạy thực tế, API /api/music sẽ tự động đọc từ Cloudflare R2 hoặc quét `public/assets/music`.
 */
export const fallbackPlaylist: MusicTrack[] = [
  {
    name: "through the light",
    artist: "dracodraco",
    file: "dracodraco - through the light.mp3",
    cover: "/assets/music/covers/dracodraco%20-%20through%20the%20light.jpg",
  },
  {
    name: "GORE-TEX COVERS MY SOUL",
    artist: "Blksmiith",
    file: "Blksmiith - GORE-TEX COVERS MY SOUL.mp3",
    cover: "/assets/music/covers/Blksmiith%20-%20GORE-TEX%20COVERS%20MY%20SOUL.jpg",
  },
  {
    name: "Face The Future",
    artist: "DXRKWRLD",
    file: "DXRKWRLD - Face The Future.mp3",
    cover: "/assets/music/covers/DXRKWRLD%20-%20Face%20The%20Future.jpg",
  },
  {
    name: "Final wish",
    artist: "ooxygen",
    file: "ooxygen - Final wish.mp3",
    cover: "/assets/music/covers/ooxygen%20-%20Final%20wish.jpg",
  },
  {
    name: "Blazing in the Dark",
    artist: "GnB Chili",
    file: "GnB Chili - Blazing in the Dark.mp3",
    cover: "/assets/music/covers/GnB%20Chili%20-%20Blazing%20in%20the%20Dark.jpg",
  },
  {
    name: "Shine or Die",
    artist: "Ftlframe",
    file: "Ftlframe - Shine or Die.mp3",
    cover: "/assets/music/covers/Ftlframe%20-%20Shine%20or%20Die.jpg",
  },
  {
    name: "Emptiness",
    artist: "TOKYOPILL",
    file: "TOKYOPILL - Emptiness.mp3",
    cover: "/assets/music/covers/TOKYOPILL%20-%20Emptiness.jpg",
  },
  {
    name: "F R A G M E N T",
    artist: "Blksmiith",
    file: "Blksmiith - F R A G M E N T.mp3",
    cover: "/assets/music/covers/Blksmiith%20-%20F%20R%20A%20G%20M%20E%20N%20T.jpg",
  },
  {
    name: "Pure Judgement",
    artist: "amore",
    file: "amore - Pure Judgement.mp3",
    cover: "/assets/music/covers/amore%20-%20Pure%20Judgement.jpg",
  },
  {
    name: "amnesia",
    artist: "In Explosions",
    file: "In Explosions - amnesia.mp3",
    cover: "/assets/music/covers/In%20Explosions%20-%20amnesia.jpg",
  },
  {
    name: "Subject Haise",
    artist: "FlowerBoyDeMii",
    file: "FlowerBoyDeMii - Subject Haise.mp3",
    cover: "/assets/music/covers/FlowerBoyDeMii%20-%20Subject%20Haise.jpg",
  },
];
