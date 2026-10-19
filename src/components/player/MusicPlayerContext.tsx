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

    const savedPaused = localStorage.getItem("music_paused");
    if (savedPaused === "true") {
      isManuallyPausedRef.current = true;
    }

    const savedVol = localStorage.getItem("music_volume");
    const initialVol = savedVol !== null ? parseFloat(savedVol) : DEFAULT_VOLUME;
    const validVol = isNaN(initialVol) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, initialVol));
    setVolumeState(validVol);
    if (validVol > 0) lastNonZeroVolumeRef.current = validVol;

    if (audioRef.current) {
      audioRef.current.volume = validVol;
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
        audioRef.current.src = track.url || `/assets/music/${encodeURIComponent(track.file)}`;
        const savedTime = localStorage.getItem("music_current_time");
        if (savedTime !== null) {
          const parsedTime = parseFloat(savedTime);
          if (!isNaN(parsedTime) && isFinite(parsedTime)) {
            audioRef.current.currentTime = parsedTime;
            setCurrentTime(parsedTime);
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

  // Tự động phát nhạc khi người dùng tương tác lần đầu (nếu trước đó chưa bấm tạm dừng)
  useEffect(() => {
    const tryAutoPlay = () => {
      if (isManuallyPausedRef.current) {
        window.removeEventListener("click", tryAutoPlay);
        window.removeEventListener("touchstart", tryAutoPlay);
        return;
      }
      const audio = audioRef.current;
      if (!audio || !audio.src) return;

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          localStorage.setItem("music_paused", "false");
          window.removeEventListener("click", tryAutoPlay);
          window.removeEventListener("touchstart", tryAutoPlay);
        })
        .catch(() => {
          // Trình duyệt chặn autoplay cho tới khi có tương tác hợp lệ tiếp theo
        });
    };

    window.addEventListener("click", tryAutoPlay);
    window.addEventListener("touchstart", tryAutoPlay);

    return () => {
      window.removeEventListener("click", tryAutoPlay);
      window.removeEventListener("touchstart", tryAutoPlay);
    };
  }, []);

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

    if (audio.paused) {
      isManuallyPausedRef.current = false;
      localStorage.setItem("music_paused", "false");
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      isManuallyPausedRef.current = true;
      localStorage.setItem("music_paused", "true");
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

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

  const seekToPercent = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    const clamped = Math.max(0, Math.min(1, percent));
    audio.currentTime = clamped * audio.duration;
    setCurrentTime(audio.currentTime);
  }, []);

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
          const now = performance.now();
          if (now - lastUpdateRef.current < 200) return;
          lastUpdateRef.current = now;
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            localStorage.setItem(
              "music_current_time",
              String(audioRef.current.currentTime)
            );
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={nextTrack}
        onError={() => {
          if (currentTrackIndex < playlist.length - 1) {
            nextTrack();
          }
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
