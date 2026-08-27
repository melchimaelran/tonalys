"use client";

import { useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Pause, Play, Repeat } from "@phosphor-icons/react";
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

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const canLoop = pointA !== null && pointB !== null && pointA < pointB;

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
    const audio = event.currentTarget;
    const time = audio.currentTime;

    if (loopEnabled && pointA !== null && pointB !== null && pointA < pointB && time >= pointB) {
      audio.currentTime = pointA;
      return;
    }

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
    // Re-assert defensively — not proven necessary on any current engine,
    // but this API's cross-browser behavior around playbackRate changes is
    // exactly the kind of thing CLAUDE.md flags as needing real-device
    // verification, and the call is free.
    setPreservesPitch(audio);
  }

  function handleSetPointA() {
    const audio = audioRef.current;
    if (!audio) return;
    const time = audio.currentTime;
    setPointA(time);
    setLoopEnabled(pointB !== null && time < pointB);
  }

  function handleSetPointB() {
    const audio = audioRef.current;
    if (!audio) return;
    const time = audio.currentTime;
    setPointB(time);
    setLoopEnabled(pointA !== null && pointA < time);
  }

  function toggleLoop() {
    setLoopEnabled((enabled) => {
      const next = !enabled;
      if (!next) {
        setPointA(null);
        setPointB(null);
      }
      return next;
    });
  }

  function setAudioRef(node: HTMLAudioElement | null) {
    audioRef.current = node;
    if (node) {
      setPreservesPitch(node);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <audio
        ref={setAudioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <div className="flex w-full items-center gap-3">
        <div className="relative flex h-5 flex-1 items-center">
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer rounded-full accent-primary"
          />
          {pointA !== null && duration > 0 && (
            <div
              data-testid="loop-marker-a"
              className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-amber-500"
              style={{ left: `${(pointA / duration) * 100}%` }}
            />
          )}
          {pointB !== null && duration > 0 && (
            <div
              data-testid="loop-marker-b"
              className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-amber-500"
              style={{ left: `${(pointB / duration) * 100}%` }}
            />
          )}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause aria-hidden weight="fill" />
          ) : (
            <Play aria-hidden weight="fill" />
          )}
        </Button>
        <select
          aria-label="Playback speed"
          defaultValue="1"
          onChange={handleSpeedChange}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">A–B Loop</span>
        <Button type="button" size="sm" variant="outline" onClick={handleSetPointA}>
          {pointA !== null ? `A ${formatTime(pointA)}` : "Set A"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleSetPointB}>
          {pointB !== null ? `B ${formatTime(pointB)}` : "Set B"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={loopEnabled ? "default" : "outline"}
          disabled={!canLoop}
          aria-pressed={loopEnabled}
          onClick={toggleLoop}
          className="ml-auto"
        >
          <Repeat data-icon="inline-start" aria-hidden />
          Reset
        </Button>
      </div>
    </div>
  );
}
