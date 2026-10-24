"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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

const R2_PUBLIC_BASE = "https://pub-971f8c3413884a3699ded2d04761153b.r2.dev";

function resolveTrackAudioSrc(track?: MusicTrack): string {
  if (!track) return "";
  if (track.url && track.url.startsWith("http")) return track.url;
  if (track.file) return `${R2_PUBLIC_BASE}/music/${encodeURIComponent(track.file)}`;
  return "";
}

/**
 * Tìm index chính xác của bài hát trong danh sách tracks dựa trên độ ưu tiên:
 * 1. Khớp track ID (nếu có)
 * 2. Khớp trực tiếp URL audioRef.current.src (bao gồm cả encoded và decoded filename)
 * 3. Khớp tên file (activeFileName hoặc safeStorageGet("music_track_file"))
 * 4. Index ưu tiên (nếu còn hợp lệ trong khoảng mảng)
 * 5. Bài hát đánh dấu mặc định (isDefault === true) hoặc bài đầu tiên (index 0)
 */
function findMatchingTrackIndex(
  tracks: MusicTrack[],
  currentAudioSrc?: string | null,
  activeFileName?: string | null,
  activeTrackId?: string | null,
  preferredIndex = 0
): number {
  if (!tracks || tracks.length === 0) return 0;

  // 1. Khớp track ID
  if (activeTrackId) {
    const idxById = tracks.findIndex((t) => t.id && String(t.id) === String(activeTrackId));
    if (idxById !== -1) return idxById;
  }

  // 2. Khớp trực tiếp audio.src đang phát trên trình duyệt
  if (currentAudioSrc) {
    const cleanSrc = currentAudioSrc.trim();
    let decodedSrc = "";
    try {
      decodedSrc = decodeURIComponent(cleanSrc);
    } catch {
      decodedSrc = cleanSrc;
    }

    const idxBySrc = tracks.findIndex((t) => {
      const targetSrc = resolveTrackAudioSrc(t);
      if (targetSrc && (cleanSrc === targetSrc || cleanSrc.startsWith(targetSrc))) {
        return true;
      }
      if (t.file) {
        const encFile = encodeURIComponent(t.file);
        if (cleanSrc.endsWith(encFile) || cleanSrc.includes(encFile)) {
          return true;
        }
        if (decodedSrc.endsWith(t.file) || decodedSrc.includes(t.file)) {
          return true;
        }
      }
      return false;
    });
    if (idxBySrc !== -1) return idxBySrc;
  }

  // 3. Khớp theo filename đang hoạt động hoặc đã lưu
  if (activeFileName) {
    const lowerFile = activeFileName.trim().toLowerCase();
    const idxByFile = tracks.findIndex(
      (t) => t.file && t.file.trim().toLowerCase() === lowerFile
    );
    if (idxByFile !== -1) return idxByFile;
  }

  // 4. Index ưu tiên nếu nằm trong phạm vi mảng
  if (preferredIndex >= 0 && preferredIndex < tracks.length) {
    return preferredIndex;
  }

  // 5. Bài hát mặc định (isDefault) hoặc bài đầu tiên
  const defaultIdx = tracks.findIndex((t) => t.isDefault);
  return defaultIdx !== -1 ? defaultIdx : 0;
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNonZeroVolumeRef = useRef<number>(DEFAULT_VOLUME);
  const isManuallyPausedRef = useRef<boolean>(false);
  const hasInitializedDefaultRef = useRef<boolean>(false);

  const [playlist, setPlaylist] = useState<MusicTrack[]>(fallbackPlaylist);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const currentTrackIndexRef = useRef<number>(0);
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

  // Luôn đảm bảo currentTrackIndexRef đồng bộ tuyệt đối với React state
  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

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

  // Tải danh sách nhạc từ API /api/music và khôi phục trạng thái
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

    // Khởi tạo bài hát ban đầu từ audio element hoặc storage (chỉ chạy một lần lúc khởi động)
    if (!hasInitializedDefaultRef.current) {
      const savedFile = safeStorageGet("music_track_file");
      const savedIdxStr = safeStorageGet("music_track_index");
      const savedIdx = savedIdxStr !== null ? parseInt(savedIdxStr, 10) : NaN;

      const initialIdx = findMatchingTrackIndex(
        fallbackPlaylist,
        audioRef.current?.src,
        savedFile,
        null,
        !isNaN(savedIdx) ? savedIdx : 0
      );

      setCurrentTrackIndex(initialIdx);
      currentTrackIndexRef.current = initialIdx;

      const initialTrack = fallbackPlaylist[initialIdx] || fallbackPlaylist[0];
      if (audioRef.current && initialTrack && !audioRef.current.src) {
        audioRef.current.src = resolveTrackAudioSrc(initialTrack);
      }
    }

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

    const syncTracksWithState = (tracks: MusicTrack[]) => {
      setPlaylist(tracks);

      // Nhận diện bài hát đang phát hoặc đã lưu để không bao giờ bị reset về bài 0
      const audio = audioRef.current;
      const currentSong = playlist[currentTrackIndexRef.current];
      const activeFile = currentSong?.file || safeStorageGet("music_track_file");
      const activeId = currentSong?.id;

      const resolvedIndex = findMatchingTrackIndex(
        tracks,
        audio?.src,
        activeFile,
        activeId,
        currentTrackIndexRef.current
      );

      setCurrentTrackIndex(resolvedIndex);
      currentTrackIndexRef.current = resolvedIndex;

      // Chỉ gán audio.src nếu chưa từng có src
      if (audio && !audio.src) {
        const track = tracks[resolvedIndex];
        if (track) {
          audio.src = resolveTrackAudioSrc(track);
        }
      }
      hasInitializedDefaultRef.current = true;
    };

    fetch("/api/music", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const rawTracks =
          data && Array.isArray(data) && data.length > 0 ? data : fallbackPlaylist;
        // Ưu tiên thứ tự chuẩn trực tiếp từ Central SQL Database
        syncTracksWithState(rawTracks);
      })
      .catch(() => {
        if (!isMounted) return;
        const orderedFallback = applyCustomOrder(fallbackPlaylist);
        syncTracksWithState(orderedFallback);
      });

    // Tự động làm mới danh sách nhạc theo thời gian thực khi người dùng quay lại tab trình duyệt
    // Đảm bảo nhận diện và bảo toàn nguyên vẹn bài hát đang phát
    const refreshPlaylistOnFocus = () => {
      fetch("/api/music", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (Array.isArray(data) && data.length > 0) {
            setPlaylist((prevPlaylist) => {
              const audio = audioRef.current;
              const currentSong = prevPlaylist[currentTrackIndexRef.current];
              const activeFile = currentSong?.file || safeStorageGet("music_track_file");
              const activeId = currentSong?.id;

              const newIdx = findMatchingTrackIndex(
                data,
                audio?.src,
                activeFile,
                activeId,
                currentTrackIndexRef.current
              );

              setCurrentTrackIndex(newIdx);
              currentTrackIndexRef.current = newIdx;
              safeStorageSet("music_track_index", String(newIdx));
              if (data[newIdx]?.file) {
                safeStorageSet("music_track_file", data[newIdx].file);
              }
              return data;
            });
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", refreshPlaylistOnFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPlaylistOnFocus();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshPlaylistOnFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Đồng bộ trạng thái trực tiếp từ <audio> element khi chuyển tab / route (Overview ↔ Projects)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Chỉ cập nhật isPlaying nếu trạng thái thực sự thay đổi
    const nextIsPlaying = !audio.paused && !audio.ended && audio.readyState > 0;
    setIsPlaying((prev) => (prev !== nextIsPlaying ? nextIsPlaying : prev));

    // Chỉ cập nhật currentTime nếu bị lệch đáng kể (> 1.5s) tránh kích hoạt re-render bão táp
    if (audio.currentTime > 0) {
      setCurrentTime((prev) =>
        Math.abs(prev - audio.currentTime) > 1.5 ? audio.currentTime : prev
      );
    }
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      setDuration((prev) =>
        Math.abs(prev - audio.duration) > 0.5 ? audio.duration : prev
      );
    }

    // Đảm bảo UI index luôn khớp với audio.src hiện tại khi vừa đổi route
    if (audio.src && playlist.length > 0) {
      const activeSong = playlist[currentTrackIndexRef.current];
      const matchedIdx = findMatchingTrackIndex(
        playlist,
        audio.src,
        activeSong?.file || safeStorageGet("music_track_file"),
        activeSong?.id,
        currentTrackIndexRef.current
      );
      if (matchedIdx !== currentTrackIndexRef.current) {
        setCurrentTrackIndex(matchedIdx);
        currentTrackIndexRef.current = matchedIdx;
      }
    }
  }, [pathname, playlist]);

  // Tự động phát nhạc lúc khởi động:
  // 1. Thử gọi audio.play() ngay khi vừa mở trang (nếu trình duyệt cho phép thì nhạc sẽ chạy liền).
  // 2. Nếu trình duyệt chặn do chính sách Autoplay Policy, tự động kích hoạt ngay khi người dùng có tương tác đầu tiên (click, chạm màn hình, cuộn chuột, nhấn phím).
  // Tuyệt đối không tự động phát đè nếu người dùng đã chủ động bấm Tạm dừng (isManuallyPausedRef).
  useEffect(() => {
    const events = ["pointerdown", "touchstart", "click", "keydown", "wheel"] as const;

    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, tryPlayOnGesture));
    };

    const tryPlayOnGesture = () => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;
      if (isManuallyPausedRef.current) {
        cleanup();
        return;
      }

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
    if (audio && audio.src && !isManuallyPausedRef.current) {
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
  }, []);

  const loadAndPlayTrack = useCallback(
    (index: number, autoPlay = true) => {
      const track = playlist[index];
      if (!track || !audioRef.current) return;

      setCurrentTrackIndex(index);
      currentTrackIndexRef.current = index;
      safeStorageSet("music_track_index", String(index));
      safeStorageSet("music_track_file", track.file);

      const audio = audioRef.current;
      const targetSrc = resolveTrackAudioSrc(track);
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
      loadAndPlayTrack(currentTrackIndexRef.current, true);
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
          loadAndPlayTrack(currentTrackIndexRef.current, true);
        });
    } else {
      isManuallyPausedRef.current = true;
      safeStorageSet("music_paused", "true");
      audio.pause();
      setIsPlaying(false);
    }
  }, [loadAndPlayTrack]);

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
    const currentIdx = currentTrackIndexRef.current;
    if (isShuffle && playlist.length > 1) {
      const nextIdx = getRandomIndex(currentIdx, playlist.length);
      loadAndPlayTrack(nextIdx, true);
    } else {
      const nextIdx = (currentIdx + 1) % playlist.length;
      loadAndPlayTrack(nextIdx, true);
    }
  }, [playlist.length, isShuffle, getRandomIndex, loadAndPlayTrack]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const currentIdx = currentTrackIndexRef.current;
    if (isShuffle && playlist.length > 1) {
      const prevIdx = getRandomIndex(currentIdx, playlist.length);
      loadAndPlayTrack(prevIdx, true);
    } else {
      const prevIdx = (currentIdx - 1 + playlist.length) % playlist.length;
      loadAndPlayTrack(prevIdx, true);
    }
  }, [playlist.length, isShuffle, getRandomIndex, loadAndPlayTrack]);

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

        const currentSong = prevPlaylist[currentTrackIndexRef.current];
        const updated = [...prevPlaylist];
        const [moved] = updated.splice(startIndex, 1);
        updated.splice(endIndex, 0, moved);

        // Duy trì vị trí đúng cho bài hát đang phát
        if (currentSong) {
          const newIdx = updated.findIndex((t) => t.file === currentSong.file);
          if (newIdx !== -1) {
            setCurrentTrackIndex(newIdx);
            currentTrackIndexRef.current = newIdx;
            safeStorageSet("music_track_index", String(newIdx));
            safeStorageSet("music_track_file", currentSong.file);
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
    []
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

    const currentIdx = currentTrackIndexRef.current;
    if (repeatMode === "off" && !isShuffle && currentIdx >= playlist.length - 1) {
      setIsPlaying(false);
      return;
    }

    nextTrack();
  }, [repeatMode, isShuffle, playlist.length, nextTrack]);

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
        onPlay={() => {
          setIsPlaying(true);
          isManuallyPausedRef.current = false;
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleTrackEnded}
        onError={() => {
          const audio = audioRef.current;
          const track = playlist[currentTrackIndexRef.current] || playlist[currentTrackIndex];
          if (audio && track && track.file) {
            const r2Fallback = `${R2_PUBLIC_BASE}/music/${encodeURIComponent(track.file)}`;
            if (audio.src !== r2Fallback) {
              console.warn("[MusicPlayer] Streaming error, retrying direct R2 CDN:", track.file);
              audio.src = r2Fallback;
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
