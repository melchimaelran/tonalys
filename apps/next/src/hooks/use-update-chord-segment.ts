import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChordSegment } from "@/lib/find-chord-at-time";

export interface UpdateChordSegmentInput {
  segmentId: string;
  root: string;
  chordType: string;
  bassNote?: string | null;
}

async function updateChordSegment(
  trackId: string,
  { segmentId, root, chordType, bassNote }: UpdateChordSegmentInput,
): Promise<ChordSegment> {
  const response = await fetch(`/api/tracks/${trackId}/chords/${segmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      bassNote !== undefined ? { root, chordType, bassNote } : { root, chordType },
    ),
  });
  if (!response.ok) {
    throw new Error("Failed to update chord segment");
  }
  return (await response.json()) as ChordSegment;
}

export function useUpdateChordSegment(trackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateChordSegmentInput) => updateChordSegment(trackId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chords", trackId] });
    },
  });
}
