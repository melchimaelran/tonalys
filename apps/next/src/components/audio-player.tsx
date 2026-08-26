"use client";

import { useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";

export interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ src, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(event.target.value);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    const time = event.currentTarget.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    const { duration: nextDuration } = event.currentTarget;
    setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <Button
        type="button"
        size="sm"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        className="flex-1"
      />
    </div>
  );
}
