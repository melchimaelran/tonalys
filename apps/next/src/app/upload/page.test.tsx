import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import UploadPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<UploadPage />, { wrapper: Wrapper });
}

describe("UploadPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the upload dropzone", () => {
    renderPage();

    expect(screen.getByText(/drag and drop an audio file/i)).toBeInTheDocument();
  });

  it("shows the selected file name once a file is chosen", () => {
    renderPage();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    const input = screen.getByLabelText(/drag and drop an audio file/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/track\.mp3/i)).toBeInTheDocument();
  });

  it("switches to the YouTube link form when that tab is selected", () => {
    renderPage();

    expect(screen.queryByLabelText(/youtube link/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));

    expect(screen.getByLabelText(/youtube link/i)).toBeInTheDocument();
    expect(screen.queryByText(/drag and drop an audio file/i)).not.toBeInTheDocument();
  });

  it("switches back to the file dropzone from the YouTube tab", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    fireEvent.click(screen.getByRole("tab", { name: /upload file/i }));

    expect(screen.getByText(/drag and drop an audio file/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/youtube link/i)).not.toBeInTheDocument();
  });

  it("clears the selected file name after switching away and back to the file tab", () => {
    renderPage();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drag and drop an audio file/i), {
      target: { files: [file] },
    });
    expect(screen.getByText(/track\.mp3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    fireEvent.click(screen.getByRole("tab", { name: /upload file/i }));

    expect(screen.queryByText(/track\.mp3/i)).not.toBeInTheDocument();
  });

  it("submits the selected file to /api/upload and shows the job status once accepted", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/upload") {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "track-1", jobId: "job-1" }), { status: 201 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "job-1",
            trackId: "track-1",
            status: "PENDING",
            errorMessage: null,
          }),
          { status: 200 },
        ),
      );
    });
    renderPage();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drag and drop an audio file/i), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() =>
      expect(screen.getByTestId("job-status")).toHaveTextContent("Status: PENDING"),
    );
    const [uploadUrl, uploadInit] = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input) === "/api/upload") as [string, RequestInit];
    expect(uploadUrl).toBe("/api/upload");
    expect(uploadInit.body).toBeInstanceOf(FormData);
  });

  it("shows an error and stays on the form when the upload is rejected", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "File is too large" }), { status: 413 }),
    );
    renderPage();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drag and drop an audio file/i), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() =>
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("job-status")).not.toBeInTheDocument();
  });

  it("submits a YouTube link to /api/youtube and shows the job status once accepted", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/youtube") {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "track-1", jobId: "job-1" }), { status: 201 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "job-1",
            trackId: "track-1",
            status: "PENDING",
            errorMessage: null,
          }),
          { status: 200 },
        ),
      );
    });
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() =>
      expect(screen.getByTestId("job-status")).toHaveTextContent("Status: PENDING"),
    );
    const [youtubeUrl, youtubeInit] = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input) === "/api/youtube") as [string, RequestInit];
    expect(youtubeUrl).toBe("/api/youtube");
    expect(youtubeInit.body).toBe(
      JSON.stringify({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
    );
  });

  it("shows an error when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));
    renderPage();
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/drag and drop an audio file/i), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() =>
      expect(screen.getByText(/analysis service unavailable/i)).toBeInTheDocument(),
    );
  });
});
