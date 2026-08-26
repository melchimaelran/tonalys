import { useQuery } from "@tanstack/react-query";
import type { ChordSegment } from "@/lib/find-chord-at-time";

async function fetchTrackChords(trackId: string): Promise<ChordSegment[]> {
  const response = await fetch(`/api/tracks/${trackId}/chords`);
  if (!response.ok) {
    throw new Error("Failed to fetch chord segments");
  }
  try {
    return (await response.json()) as ChordSegment[];
  } catch {
    throw new Error("Received an unexpected response while fetching chord segments");
  }
}

export function useTrackChords(trackId: string | null) {
  return useQuery({
    queryKey: ["chords", trackId],
    queryFn: () => fetchTrackChords(trackId!),
    enabled: trackId !== null,
  });
}
