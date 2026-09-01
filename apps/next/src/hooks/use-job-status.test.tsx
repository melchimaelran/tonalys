import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useJobStatus, getRefetchInterval, POLL_INTERVAL_MS } from "./use-job-status";
import type { JobStatus } from "./use-job-status";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function jobStatus(overrides: Partial<JobStatus> = {}): JobStatus {
  return {
    id: "job-1",
    trackId: "track-1",
    status: "PENDING",
    errorMessage: null,
    queuePosition: 0,
    ...overrides,
  };
}

describe("getRefetchInterval", () => {
  it("returns the poll interval while pending or processing", () => {
    expect(getRefetchInterval(jobStatus({ status: "PENDING" }))).toBe(POLL_INTERVAL_MS);
    expect(getRefetchInterval(jobStatus({ status: "PROCESSING" }))).toBe(POLL_INTERVAL_MS);
  });

  it("stops polling once the job is done or has errored", () => {
    expect(getRefetchInterval(jobStatus({ status: "DONE" }))).toBe(false);
    expect(getRefetchInterval(jobStatus({ status: "ERROR" }))).toBe(false);
  });

  it("returns the poll interval when there is no data yet", () => {
    expect(getRefetchInterval(undefined)).toBe(POLL_INTERVAL_MS);
  });
});

describe("useJobStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches the job status from /api/jobs/:id", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(jobStatus()), { status: 200 }),
    );

    const { result } = renderHook(() => useJobStatus("job-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.status).toBe("PENDING"));
    expect(fetch).toHaveBeenCalledWith("/api/jobs/job-1");
  });

  it("surfaces the queue position from the response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(jobStatus({ queuePosition: 4 })), { status: 200 }),
    );

    const { result } = renderHook(() => useJobStatus("job-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.queuePosition).toBe(4));
  });

  it("does not fetch when jobId is null", () => {
    renderHook(() => useJobStatus(null), { wrapper: createWrapper() });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("errors out cleanly when the response body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("not json", { status: 200 }),
    );

    const { result } = renderHook(() => useJobStatus("job-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
