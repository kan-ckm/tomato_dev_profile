import { MusicTrack } from "@/types";

export const DEFAULT_TRACK_FILE = "Blksmiith - F R A G M E N T.mp3";
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
    name: "Pure Judgement",
    artist: "amore",
    file: "amore - Pure Judgement.mp3",
    cover: "/assets/music/covers/amore%20-%20Pure%20Judgement.jpg",
  },
  {
    name: "Oh It's You",
    artist: "babychair",
    file: "babychair - Oh It's You.mp3",
    cover: "/assets/music/covers/babychair%20-%20Oh%20It's%20You.jpg",
  },
  {
    name: "F R A G M E N T",
    artist: "Blksmiith",
    file: "Blksmiith - F R A G M E N T.mp3",
    cover: "/assets/music/covers/Blksmiith%20-%20F%20R%20A%20G%20M%20E%20N%20T.jpg",
  },
  {
    name: "GORE-TEX COVERS MY SOUL",
    artist: "Blksmiith",
    file: "Blksmiith - GORE-TEX COVERS MY SOUL.mp3",
    cover: "/assets/music/covers/Blksmiith%20-%20GORE-TEX%20COVERS%20MY%20SOUL.jpg",
  },
  {
    name: "No One",
    artist: "brb., HYBS",
    file: "brb., HYBS - No One.mp3",
    cover: "/assets/music/covers/brb.%2C%20HYBS%20-%20No%20One.jpg",
  },
  {
    name: "Losing You",
    artist: "Christian Kuria",
    file: "Christian Kuria - Losing You.mp3",
    cover: "/assets/music/covers/Christian%20Kuria%20-%20Losing%20You.jpg",
  },
  {
    name: "Hello Juliet",
    artist: "Clarion",
    file: "Clarion - Hello Juliet.mp3",
    cover: "/assets/music/covers/Clarion%20-%20Hello%20Juliet.jpg",
  },
  {
    name: "Face The Future",
    artist: "DXRKWRLD",
    file: "DXRKWRLD - Face The Future.mp3",
    cover: "/assets/music/covers/DXRKWRLD%20-%20Face%20The%20Future.jpg",
  },
  {
    name: "what if we",
    artist: "Emi Choi",
    file: "Emi Choi - what if we.mp3",
    cover: "/assets/music/covers/Emi%20Choi%20-%20what%20if%20we.jpg",
  },
  {
    name: "Subject Haise",
    artist: "FlowerBoyDeMii",
    file: "FlowerBoyDeMii - Subject Haise.mp3",
    cover: "/assets/music/covers/FlowerBoyDeMii%20-%20Subject%20Haise.jpg",
  },
  {
    name: "Shine or Die",
    artist: "Ftlframe",
    file: "Ftlframe - Shine or Die.mp3",
    cover: "/assets/music/covers/Ftlframe%20-%20Shine%20or%20Die.jpg",
  },
  {
    name: "Blazing in the Dark",
    artist: "GnB Chili",
    file: "GnB Chili - Blazing in the Dark.mp3",
    cover: "/assets/music/covers/GnB%20Chili%20-%20Blazing%20in%20the%20Dark.jpg",
  },
  {
    name: "Comin' Through",
    artist: "Hojean",
    file: "Hojean - Comin' Through.mp3",
    cover: "/assets/music/covers/Hojean%20-%20Comin'%20Through.jpg",
  },
  {
    name: "Over 85",
    artist: "Hojean",
    file: "Hojean - Over 85.mp3",
    cover: "/assets/music/covers/Hojean%20-%20Over%2085.jpg",
  },
  {
    name: "Killer",
    artist: "HYBS",
    file: "HYBS - Killer.mp3",
    cover: "/assets/music/covers/HYBS%20-%20Killer.jpg",
  },
  {
    name: "Ride",
    artist: "HYBS",
    file: "HYBS - Ride.mp3",
    cover: "/assets/music/covers/HYBS%20-%20Ride.jpg",
  },
  {
    name: "Tip Toe",
    artist: "HYBS",
    file: "HYBS - Tip Toe.mp3",
    cover: "/assets/music/covers/HYBS%20-%20Tip%20Toe.jpg",
  },
  {
    name: "Good Care",
    artist: "HYBS, slchld, asiatic.wav",
    file: "HYBS, slchld, asiatic.wav - Good Care.mp3",
    cover: "/assets/music/covers/HYBS%2C%20slchld%2C%20asiatic.wav%20-%20Good%20Care.jpg",
  },
  {
    name: "amnesia",
    artist: "In Explosions",
    file: "In Explosions - amnesia.mp3",
    cover: "/assets/music/covers/In%20Explosions%20-%20amnesia.jpg",
  },
  {
    name: "Dim The Lights",
    artist: "James Alyn",
    file: "James Alyn - Dim The Lights.mp3",
    cover: "/assets/music/covers/James%20Alyn%20-%20Dim%20The%20Lights.jpg",
  },
  {
    name: "Now and Ever",
    artist: "James Alyn",
    file: "James Alyn - Now and Ever.mp3",
    cover: "/assets/music/covers/James%20Alyn%20-%20Now%20and%20Ever.jpg",
  },
  {
    name: "No Reservations",
    artist: "Jesse Barrera",
    file: "Jesse Barrera - No Reservations.mp3",
    cover: "/assets/music/covers/Jesse%20Barrera%20-%20No%20Reservations.jpg",
  },
  {
    name: "Blue Butterflies",
    artist: "JHIN",
    file: "JHIN - Blue Butterflies.mp3",
    cover: "/assets/music/covers/JHIN%20-%20Blue%20Butterflies.jpg",
  },
  {
    name: "Final wish",
    artist: "ooxygen",
    file: "ooxygen - Final wish.mp3",
    cover: "/assets/music/covers/ooxygen%20-%20Final%20wish.jpg",
  },
  {
    name: "Infatuated",
    artist: "Rangga Jones",
    file: "Rangga Jones - Infatuated.mp3",
    cover: "/assets/music/covers/Rangga%20Jones%20-%20Infatuated.jpg",
  },
  {
    name: "Never Gonna Give You Up",
    artist: "Rick Astley",
    file: "Rick Astley - Never Gonna Give You Up.mp3",
    cover: "/assets/music/covers/Rick%20Astley%20-%20Never%20Gonna%20Give%20You%20Up.jpg",
  },
  {
    name: "Traingazing",
    artist: "Sam Wills, Honey Mooncie",
    file: "Sam Wills, Honey Mooncie - Traingazing.mp3",
    cover: "/assets/music/covers/Sam%20Wills%2C%20Honey%20Mooncie%20-%20Traingazing.jpg",
  },
  {
    name: "Anybody",
    artist: "shae, WIMY",
    file: "shae, WIMY - Anybody.mp3",
    cover: "/assets/music/covers/shae%2C%20WIMY%20-%20Anybody.jpg",
  },
  {
    name: "better for you",
    artist: "siopaolo",
    file: "siopaolo - better for you.mp3",
    cover: "/assets/music/covers/siopaolo%20-%20better%20for%20you.jpg",
  },
  {
    name: "complicatedoverrated",
    artist: "The Millennial Club",
    file: "The Millennial Club - complicatedoverrated.mp3",
    cover: "/assets/music/covers/The%20Millennial%20Club%20-%20complicatedoverrated.jpg",
  },
  {
    name: "Emptiness",
    artist: "TOKYOPILL",
    file: "TOKYOPILL - Emptiness.mp3",
    cover: "/assets/music/covers/TOKYOPILL%20-%20Emptiness.jpg",
  },
  {
    name: "light",
    artist: "wave to earth",
    file: "wave to earth - light.mp3",
    cover: "/assets/music/covers/wave%20to%20earth%20-%20light.jpg",
  },
  {
    name: "peach eyes",
    artist: "wave to earth",
    file: "wave to earth - peach eyes.mp3",
    cover: "/assets/music/covers/wave%20to%20earth%20-%20peach%20eyes.jpg",
  },
];
