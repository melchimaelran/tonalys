import { useQuery } from "@tanstack/react-query";

export interface JobStatus {
  id: string;
  trackId: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  errorMessage: string | null;
}

export const POLL_INTERVAL_MS = 2000;

export function getRefetchInterval(data: JobStatus | undefined): number | false {
  if (data?.status === "DONE" || data?.status === "ERROR") return false;
  return POLL_INTERVAL_MS;
}

async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch job status");
  }
  try {
    return (await response.json()) as JobStatus;
  } catch {
    throw new Error("Received an unexpected response while fetching job status");
  }
}

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => getRefetchInterval(query.state.data),
  });
}
