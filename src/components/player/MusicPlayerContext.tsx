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
import { MusicTrack } from "@/types";

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
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (index: number) => void;
  seekToPercent: (percent: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
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

    const savedVol = localStorage.getItem("music_volume");
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
      const savedFile = localStorage.getItem("music_track_file");
      const savedTrackIdx = localStorage.getItem("music_track_index");
      let resolvedIndex = 0;

      if (savedFile) {
        const foundIdx = tracks.findIndex((t) => t.file === savedFile);
        if (foundIdx !== -1) {
          resolvedIndex = foundIdx;
        } else if (savedTrackIdx !== null) {
          const parsed = parseInt(savedTrackIdx, 10);
          resolvedIndex = !isNaN(parsed) && parsed < tracks.length ? parsed : 0;
        }
      } else if (savedTrackIdx !== null) {
        const parsed = parseInt(savedTrackIdx, 10);
        resolvedIndex = !isNaN(parsed) && parsed < tracks.length ? parsed : 0;
      } else {
        const defIdx = tracks.findIndex((t) => t.file === DEFAULT_TRACK_FILE);
        resolvedIndex = defIdx !== -1 ? defIdx : 0;
      }

      setCurrentTrackIndex(resolvedIndex);
      const track = tracks[resolvedIndex];
      if (track && audioRef.current) {
        const targetSrc = track.url || `/assets/music/${encodeURIComponent(track.file)}`;
        if (audioRef.current.src !== targetSrc) {
          audioRef.current.src = targetSrc;
        }

        const savedTime = localStorage.getItem("music_current_time");
        if (savedTime !== null) {
          const parsedTime = parseFloat(savedTime);
          if (!isNaN(parsedTime) && isFinite(parsedTime) && parsedTime >= 0) {
            const onLoaded = () => {
              if (audioRef.current && isFinite(audioRef.current.duration)) {
                if (parsedTime < audioRef.current.duration) {
                  audioRef.current.currentTime = parsedTime;
                  setCurrentTime(parsedTime);
                }
              }
              audioRef.current?.removeEventListener("loadedmetadata", onLoaded);
            };
            audioRef.current.addEventListener("loadedmetadata", onLoaded);
          }
        }
      }
    };

    fetch("/api/music")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const tracks =
          data && Array.isArray(data) && data.length > 0 ? data : fallbackPlaylist;
        setPlaylist(tracks);
        initTrackFromStorage(tracks);
      })
      .catch(() => {
        if (!isMounted) return;
        initTrackFromStorage(fallbackPlaylist);
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
      localStorage.setItem("music_track_index", String(index));
      localStorage.setItem("music_track_file", track.file);

      const audio = audioRef.current;
      const targetSrc = track.url || `/assets/music/${encodeURIComponent(track.file)}`;
      if (audio.src !== targetSrc && !audio.src.endsWith(encodeURIComponent(track.file))) {
        audio.src = targetSrc;
        setCurrentTime(0);
      }

      if (autoPlay) {
        isManuallyPausedRef.current = false;
        localStorage.setItem("music_paused", "false");
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
      localStorage.setItem("music_paused", "false");
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("[MusicPlayer] Play failed, attempting reload:", err);
          loadAndPlayTrack(currentTrackIndex, true);
        });
    } else {
      isManuallyPausedRef.current = true;
      localStorage.setItem("music_paused", "true");
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrackIndex, loadAndPlayTrack]);

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    loadAndPlayTrack(nextIdx, true);
  }, [currentTrackIndex, playlist.length, loadAndPlayTrack]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadAndPlayTrack(prevIdx, true);
  }, [currentTrackIndex, playlist.length, loadAndPlayTrack]);

  const selectTrack = useCallback(
    (index: number) => {
      loadAndPlayTrack(index, true);
    },
    [loadAndPlayTrack]
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
    localStorage.setItem("music_volume", String(clamped));
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
        togglePlayPause,
        nextTrack,
        prevTrack,
        selectTrack,
        seekToPercent,
        setVolume,
        toggleMute,
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
              localStorage.setItem("music_current_time", String(cur));
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
        onEnded={nextTrack}
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
