import { useQuery } from "@tanstack/react-query";

export interface Track {
  id: string;
  title: string;
}

async function fetchTrack(trackId: string): Promise<Track> {
  const response = await fetch(`/api/tracks/${trackId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch track");
  }
  try {
    return (await response.json()) as Track;
  } catch {
    throw new Error("Received an unexpected response while fetching track");
  }
}

export function useTrack(trackId: string | null) {
  return useQuery({
    queryKey: ["track", trackId],
    queryFn: () => fetchTrack(trackId!),
    enabled: trackId !== null,
  });
}
