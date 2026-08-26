"use client";

import { useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";

export interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type PrefixedMediaElement = HTMLAudioElement & {
  webkitPreservesPitch?: boolean;
  mozPreservesPitch?: boolean;
};

// Firefox and Safari historically required a vendor-prefixed property to
// keep pitch stable when playbackRate changes — modern versions also expose
// the unprefixed `preservesPitch`, but setting all three is harmless and
// covers whichever one an older engine actually reads.
function setPreservesPitch(audio: HTMLAudioElement) {
  const prefixed = audio as PrefixedMediaElement;
  audio.preservesPitch = true;
  prefixed.webkitPreservesPitch = true;
  prefixed.mozPreservesPitch = true;
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

  function handleSpeedChange(event: ChangeEvent<HTMLSelectElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = Number(event.target.value);
    setPreservesPitch(audio);
  }

  function setAudioRef(node: HTMLAudioElement | null) {
    audioRef.current = node;
    if (node) {
      setPreservesPitch(node);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={setAudioRef}
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
      <select
        aria-label="Playback speed"
        defaultValue="1"
        onChange={handleSpeedChange}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        {PLAYBACK_SPEEDS.map((speed) => (
          <option key={speed} value={speed} className="bg-background text-foreground">
            {speed}x
          </option>
        ))}
      </select>
    </div>
  );
}
