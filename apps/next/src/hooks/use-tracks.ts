import { useQuery } from "@tanstack/react-query";

export type TrackStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";
export type TrackSourceType = "UPLOAD" | "YOUTUBE";

export interface TrackSummary {
  id: string;
  title: string;
  status: TrackStatus;
  sourceType: TrackSourceType;
  durationSeconds: number | null;
  createdAt: string;
}

async function fetchTracks(): Promise<TrackSummary[]> {
  const response = await fetch("/api/tracks");
  if (!response.ok) {
    throw new Error("Failed to fetch tracks");
  }
  try {
    return (await response.json()) as TrackSummary[];
  } catch {
    throw new Error("Received an unexpected response while fetching tracks");
  }
}

export function useTracks() {
  return useQuery({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
  });
}
