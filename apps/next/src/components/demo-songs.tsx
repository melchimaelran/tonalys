"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, MusicNote, MusicNotes } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTracks, type TrackSummary } from "@/hooks/use-tracks";

const PAGE_SIZE = 10;

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
        className="group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-foreground/5"
      >
        <MusicNote
          aria-hidden
          weight="fill"
          className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        />
        {/* Stacks on mobile (title line, then meta line) so the date and
            status never get pushed off the right edge and clipped by the
            list's overflow-hidden; single row from sm up. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="min-w-0 truncate font-medium sm:flex-1">{track.title}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {formatDate(track.createdAt)}
              {duration ? ` · ${duration}` : ""}
            </span>
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {track.status}
            </span>
          </span>
        </div>
        <CaretRight
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        />
      </Link>
    </li>
  );
}

export function DemoSongs() {
  const { data, isPending, isError } = useTracks();
  const [page, setPage] = useState(0);

  if (isPending) {
    return (
      <p className="p-4 text-sm text-muted-foreground" data-testid="demo-songs-loading">
        Loading demo songs…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="p-4 text-sm text-destructive" data-testid="demo-songs-error">
        Couldn&apos;t load the demo songs — please refresh.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <MusicNotes aria-hidden className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No demo songs yet.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = data.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <ul className="w-full divide-y divide-border overflow-hidden rounded-md border border-border">
        {pageItems.map((track) => (
          <TrackRow key={track.id} track={track} />
        ))}
      </ul>

      {totalPages > 1 && (
        <nav
          aria-label="Demo songs pages"
          className="flex items-center justify-between"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <CaretLeft data-icon="inline-start" aria-hidden />
            Prev
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
            <CaretRight data-icon="inline-end" aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
