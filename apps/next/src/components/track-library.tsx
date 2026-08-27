"use client";

import Link from "next/link";
import { CaretRight, MusicNotes, Plus } from "@phosphor-icons/react";
import { useTracks, type TrackSummary } from "@/hooks/use-tracks";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function TrackRow({ track }: { track: TrackSummary }) {
  const duration = formatDuration(track.durationSeconds);
  return (
    <li>
      <Link
        href={`/tracks/${track.id}`}
        className="flex items-center justify-between gap-4 border-b border-foreground/10 px-4 py-3 text-sm transition-colors hover:bg-foreground/5"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{track.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(track.createdAt)}
          {duration ? ` · ${duration}` : ""}
        </span>
        <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          {track.status}
        </span>
        <CaretRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function TrackLibrary() {
  const { data, isPending, isError } = useTracks();

  if (isPending) {
    return (
      <p className="p-4 text-sm text-muted-foreground" data-testid="track-library-loading">
        Loading your library…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="p-4 text-sm text-destructive" data-testid="track-library-error">
        Couldn&apos;t load your library — please refresh.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <MusicNotes aria-hidden className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No tracks yet.</p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
        >
          <Plus aria-hidden className="size-3.5" />
          Add a track
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold">Library</h2>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
        >
          <Plus aria-hidden className="size-3.5" />
          Add a track
        </Link>
      </div>
      <ul>
        {data.map((track) => (
          <TrackRow key={track.id} track={track} />
        ))}
      </ul>
    </div>
  );
}
