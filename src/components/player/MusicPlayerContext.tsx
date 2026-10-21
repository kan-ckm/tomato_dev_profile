"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_TRACK_FILE,
  DEFAULT_VOLUME,
  fallbackPlaylist,
} from "@/config/music.config";
import { safeStorageGet, safeStorageSet } from "@/lib/utils";
import { MusicTrack } from "@/types";

export type RepeatMode = "off" | "all" | "one";

interface MusicPlayerContextValue {
  playlist: MusicTrack[];
  currentTrackIndex: number;
  currentTrack: MusicTrack | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isPlaylistExpanded: boolean;
  isFloatingExpanded: boolean;
  isMobileModalOpen: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (index: number) => void;
  seekToPercent: (percent: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
  reorderPlaylist: (startIndex: number, endIndex: number) => void;
  setIsPlaylistExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFloatingExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMobileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNonZeroVolumeRef = useRef<number>(DEFAULT_VOLUME);
  const isManuallyPausedRef = useRef<boolean>(false);

  const [playlist, setPlaylist] = useState<MusicTrack[]>(fallbackPlaylist);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
    const idx = fallbackPlaylist.findIndex((t) => t.file === DEFAULT_TRACK_FILE);
    return idx !== -1 ? idx : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);

  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState<boolean>(false);
  const [isFloatingExpanded, setIsFloatingExpanded] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  // Chế độ phát ngẫu nhiên (Shuffle) và Lặp lại (Repeat: off | all | one)
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    return safeStorageGet("music_shuffle") === "true";
  });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    const saved = safeStorageGet("music_repeat_mode") as RepeatMode | null;
    return saved === "off" || saved === "one" || saved === "all" ? saved : "all";
  });

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      safeStorageSet("music_shuffle", String(next));
      return next;
    });
  }, []);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const next: RepeatMode =
        prev === "off" ? "all" : prev === "all" ? "one" : "off";
      safeStorageSet("music_repeat_mode", next);
      return next;
    });
  }, []);

  // Đồng bộ class lên document.body để hiệu ứng zoom cover sidebar hoạt động
  useEffect(() => {
    document.body.classList.toggle("playlist-is-expanded", isPlaylistExpanded);
  }, [isPlaylistExpanded]);

  useEffect(() => {
    document.body.classList.toggle("mobile-player-expanded", isFloatingExpanded);
  }, [isFloatingExpanded]);

  useEffect(() => {
    document.body.classList.toggle("modal-is-open", isMobileModalOpen);
    document.body.style.overflow = isMobileModalOpen ? "hidden" : "";
  }, [isMobileModalOpen]);

  // Tải danh sách nhạc từ API /api/music và khôi phục trạng thái từ localStorage
  useEffect(() => {
    let isMounted = true;

    // Đặt mặc định trạng thái sẵn sàng phát khi người dùng mở trang web
    isManuallyPausedRef.current = false;

    const savedVol = safeStorageGet("music_volume");
    const initialVol = savedVol !== null ? parseFloat(savedVol) : DEFAULT_VOLUME;
    const validVol = isNaN(initialVol) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, initialVol));
    setVolumeState(validVol);
    if (validVol > 0) lastNonZeroVolumeRef.current = validVol;

    if (audioRef.current) {
      audioRef.current.volume = validVol;
    }

    // Khởi tạo ngay bài hát mặc định để audio.src không bao giờ bị rỗng
    const initialTrack = fallbackPlaylist.find((t) => t.file === DEFAULT_TRACK_FILE) || fallbackPlaylist[0];
    if (audioRef.current && initialTrack && !audioRef.current.src) {
      audioRef.current.src = initialTrack.url || `/assets/music/${encodeURIComponent(initialTrack.file)}`;
    }

    const initTrackFromStorage = (tracks: MusicTrack[]) => {
      // "through the light" luôn luôn được ưu tiên phát trước khi tải trang
      const throughTheLightIdx = tracks.findIndex(
        (t) =>
          t.file === DEFAULT_TRACK_FILE ||
          t.name.toLowerCase().includes("through the light") ||
          t.file.toLowerCase().includes("through the light")
      );
      const resolvedIndex = throughTheLightIdx !== -1 ? throughTheLightIdx : 0;

      setCurrentTrackIndex(resolvedIndex);
      const track = tracks[resolvedIndex];
      if (track && audioRef.current) {
        const targetSrc = track.url || `/assets/music/${encodeURIComponent(track.file)}`;
        if (audioRef.current.src !== targetSrc) {
          audioRef.current.src = targetSrc;
        }
      }
    };

    const applyCustomOrder = (tracks: MusicTrack[]): MusicTrack[] => {
      try {
        const rawOrder = safeStorageGet("music_custom_order");
        if (!rawOrder) return tracks;
        const orderArray: string[] = JSON.parse(rawOrder);
        if (!Array.isArray(orderArray) || orderArray.length === 0) return tracks;

        const trackMap = new Map<string, MusicTrack>();
        tracks.forEach((t) => trackMap.set(t.file.toLowerCase(), t));

        const ordered: MusicTrack[] = [];
        const added = new Set<string>();

        for (const file of orderArray) {
          const lower = file.toLowerCase();
          const track = trackMap.get(lower);
          if (track && !added.has(lower)) {
            ordered.push(track);
            added.add(lower);
          }
        }

        // Bổ sung các bài mới chưa có trong danh sách order đã lưu
        for (const track of tracks) {
          if (!added.has(track.file.toLowerCase())) {
            ordered.push(track);
          }
        }

        return ordered;
      } catch {
        return tracks;
      }
    };

    fetch("/api/music", { cache: "no-cache" })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const rawTracks =
          data && Array.isArray(data) && data.length > 0 ? data : fallbackPlaylist;
        const orderedTracks = applyCustomOrder(rawTracks);
        setPlaylist(orderedTracks);
        initTrackFromStorage(orderedTracks);
      })
      .catch(() => {
        if (!isMounted) return;
        const orderedFallback = applyCustomOrder(fallbackPlaylist);
        setPlaylist(orderedFallback);
        initTrackFromStorage(orderedFallback);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Tự động phát nhạc:
  // 1. Thử gọi audio.play() ngay khi vừa mở trang (nếu trình duyệt cho phép thì nhạc sẽ chạy liền).
  // 2. Nếu trình duyệt chặn do chính sách Autoplay Policy, tự động kích hoạt ngay khi người dùng có tương tác đầu tiên (click, chạm màn hình, cuộn chuột, nhấn phím).
  useEffect(() => {
    const events = ["pointerdown", "touchstart", "click", "keydown", "wheel"] as const;

    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, tryPlayOnGesture));
    };

    const tryPlayOnGesture = () => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          isManuallyPausedRef.current = false;
          cleanup();
        })
        .catch(() => {
          // Nếu vẫn bị chặn thì giữ listener để thử lại ở cử chỉ tiếp theo
        });
    };

    // Thử phát ngay lập tức khi mở web
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          isManuallyPausedRef.current = false;
        })
        .catch(() => {
          // Trình duyệt chặn autoplay khi chưa có tương tác -> gắn sự kiện chờ cử chỉ đầu tiên
          events.forEach((ev) => window.addEventListener(ev, tryPlayOnGesture, { passive: true }));
        });
    } else {
      events.forEach((ev) => window.addEventListener(ev, tryPlayOnGesture, { passive: true }));
    }

    return () => {
      cleanup();
    };
  }, [playlist]);

  const loadAndPlayTrack = useCallback(
    (index: number, autoPlay = true) => {
      const track = playlist[index];
      if (!track || !audioRef.current) return;

      setCurrentTrackIndex(index);
      safeStorageSet("music_track_index", String(index));
      safeStorageSet("music_track_file", track.file);

      const audio = audioRef.current;
      const targetSrc = track.url || `/assets/music/${encodeURIComponent(track.file)}`;
      if (audio.src !== targetSrc && !audio.src.endsWith(encodeURIComponent(track.file))) {
        audio.src = targetSrc;
        setCurrentTime(0);
      }

      if (autoPlay) {
        isManuallyPausedRef.current = false;
        safeStorageSet("music_paused", "false");
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    },
    [playlist]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.src) {
      loadAndPlayTrack(currentTrackIndex, true);
      return;
    }

    if (audio.paused) {
      isManuallyPausedRef.current = false;
      safeStorageSet("music_paused", "false");
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("[MusicPlayer] Play failed, attempting reload:", err);
          loadAndPlayTrack(currentTrackIndex, true);
        });
    } else {
      isManuallyPausedRef.current = true;
      safeStorageSet("music_paused", "true");
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrackIndex, loadAndPlayTrack]);

  const getRandomIndex = useCallback((excludeIdx: number, length: number): number => {
    if (length <= 1) return 0;
    let rand = Math.floor(Math.random() * length);
    let attempts = 0;
    while (rand === excludeIdx && attempts < 10) {
      rand = Math.floor(Math.random() * length);
      attempts++;
    }
    return rand;
  }, []);

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    if (isShuffle && playlist.length > 1) {
      const nextIdx = getRandomIndex(currentTrackIndex, playlist.length);
      loadAndPlayTrack(nextIdx, true);
    } else {
      const nextIdx = (currentTrackIndex + 1) % playlist.length;
      loadAndPlayTrack(nextIdx, true);
    }
  }, [currentTrackIndex, playlist.length, isShuffle, getRandomIndex, loadAndPlayTrack]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    if (isShuffle && playlist.length > 1) {
      const prevIdx = getRandomIndex(currentTrackIndex, playlist.length);
      loadAndPlayTrack(prevIdx, true);
    } else {
      const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      loadAndPlayTrack(prevIdx, true);
    }
  }, [currentTrackIndex, playlist.length, isShuffle, getRandomIndex, loadAndPlayTrack]);

  const selectTrack = useCallback(
    (index: number) => {
      loadAndPlayTrack(index, true);
    },
    [loadAndPlayTrack]
  );

  const reorderPlaylist = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return;
      setPlaylist((prevPlaylist) => {
        if (
          startIndex < 0 ||
          startIndex >= prevPlaylist.length ||
          endIndex < 0 ||
          endIndex >= prevPlaylist.length
        ) {
          return prevPlaylist;
        }

        const currentSong = prevPlaylist[currentTrackIndex];
        const updated = [...prevPlaylist];
        const [moved] = updated.splice(startIndex, 1);
        updated.splice(endIndex, 0, moved);

        // Duy trì vị trí đúng cho bài hát đang phát
        if (currentSong) {
          const newIdx = updated.findIndex((t) => t.file === currentSong.file);
          if (newIdx !== -1) {
            setCurrentTrackIndex(newIdx);
            safeStorageSet("music_track_index", String(newIdx));
          }
        }

        // Lưu thứ tự mới vào localStorage
        const fileOrder = updated.map((t) => t.file);
        safeStorageSet("music_custom_order", JSON.stringify(fileOrder));

        // Đồng bộ lên API máy chủ để Admin Dashboard và toàn bộ trang cập nhật thứ tự
        fetch("/api/music/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: fileOrder }),
        }).catch((err) => {
          console.warn("[MusicPlayer] Không thể đồng bộ thứ tự lên máy chủ:", err);
        });

        return updated;
      });
    },
    [currentTrackIndex]
  );

  const seekToPercent = useCallback(
    (percent: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const dur =
        audio.duration && isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : duration;
      if (!dur || isNaN(dur) || dur <= 0) return;
      const clamped = Math.max(0, Math.min(1, percent));
      audio.currentTime = clamped * dur;
      setCurrentTime(audio.currentTime);
    },
    [duration]
  );

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    safeStorageSet("music_volume", String(clamped));
    if (clamped > 0) {
      lastNonZeroVolumeRef.current = clamped;
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      lastNonZeroVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(lastNonZeroVolumeRef.current || DEFAULT_VOLUME);
    }
  }, [volume, setVolume]);

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      return;
    }

    if (repeatMode === "off" && !isShuffle && currentTrackIndex >= playlist.length - 1) {
      setIsPlaying(false);
      return;
    }

    nextTrack();
  }, [repeatMode, isShuffle, currentTrackIndex, playlist.length, nextTrack]);

  const lastUpdateRef = useRef<number>(0);

  return (
    <MusicPlayerContext.Provider
      value={{
        playlist,
        currentTrackIndex,
        currentTrack: playlist[currentTrackIndex],
        isPlaying,
        currentTime,
        duration,
        volume,
        isPlaylistExpanded,
        isFloatingExpanded,
        isMobileModalOpen,
        isShuffle,
        repeatMode,
        togglePlayPause,
        nextTrack,
        prevTrack,
        selectTrack,
        seekToPercent,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeatMode,
        reorderPlaylist,
        setIsPlaylistExpanded,
        setIsFloatingExpanded,
        setIsMobileModalOpen,
      }}
    >
      <audio
        ref={audioRef}
        id="bg-music"
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            const cur = audioRef.current.currentTime;
            setCurrentTime(cur);
            const dur = audioRef.current.duration;
            if (dur && isFinite(dur) && dur > 0) {
              setDuration(dur);
            }
            const now = performance.now();
            if (now - lastUpdateRef.current >= 1000) {
              lastUpdateRef.current = now;
              safeStorageSet("music_current_time", String(cur));
            }
          }
        }}
        onDurationChange={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
        }}
        onCanPlay={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleTrackEnded}
        onError={() => {
          const audio = audioRef.current;
          const track = playlist[currentTrackIndex];
          if (audio && track && track.file) {
            const localFallback = `/assets/music/${encodeURIComponent(track.file)}`;
            if (audio.src !== localFallback && !audio.src.endsWith(encodeURIComponent(track.file))) {
              console.warn("[MusicPlayer] Streaming failed, falling back to local file:", track.file);
              audio.src = localFallback;
              audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              return;
            }
          }
          setIsPlaying(false);
        }}
      />
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return ctx;
}
