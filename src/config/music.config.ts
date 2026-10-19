import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = "VØJ x Narvent - Memory Reboot.mp3";
export const DEFAULT_VOLUME = 0.5;

/**
 * Danh sách nhạc dự phòng (fallback) khi API /api/music chưa phản hồi.
 * Khi chạy thực tế, API /api/music sẽ tự động quét toàn bộ file .mp3 trong `public/assets/music`.
 */
export const fallbackPlaylist: MusicTrack[] = [
  { name: "Comfort Chain", artist: "Instupendo", file: "Instupendo - Comfort Chain.mp3" },
  { name: "Golden Brown", artist: "The Stranglers", file: "The Stranglers - Golden Brown.mp3" },
  { name: "Time To Pretend", artist: "Lazer Boomerang", file: "Lazer Boomerang - Time To Pretend.mp3" },
  { name: "Interlinked", artist: "Lonely Lies, GOLDKID", file: "Lonely Lies, GOLDKID - Interlinked.mp3" },
  { name: "Deep Focus for Study", artist: "Relaxing Medieval", file: "Relaxing Medieval - Deep Focus for Study.mp3" },
  { name: "Deep Healing Relaxing Music", artist: "Tranquility", file: "Tranquility - Deep Healing Relaxing Music.mp3" },
  { name: "Ethereal", artist: "Txmy", file: "Txmy - Ethereal.mp3" },
  { name: "Study Ambience", artist: "Valley of Dreams", file: "Valley of Dreams - Study Ambience.mp3" },
  { name: "Memory Reboot", artist: "VØJ x Narvent", file: "VØJ x Narvent - Memory Reboot.mp3" },
];
