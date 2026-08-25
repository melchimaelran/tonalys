import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UploadPage from "./page";

describe("UploadPage", () => {
  it("renders the upload dropzone", () => {
    render(<UploadPage />);

    expect(screen.getByText(/drag and drop an audio file/i)).toBeInTheDocument();
  });

  it("shows the selected file name once a file is chosen", () => {
    render(<UploadPage />);
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    const input = screen.getByLabelText(/drag and drop an audio file/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/track\.mp3/i)).toBeInTheDocument();
  });

  it("switches to the YouTube link form when that tab is selected", () => {
    render(<UploadPage />);

    expect(screen.queryByLabelText(/youtube link/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));

    expect(screen.getByLabelText(/youtube link/i)).toBeInTheDocument();
    expect(screen.queryByText(/drag and drop an audio file/i)).not.toBeInTheDocument();
  });

  it("switches back to the file dropzone from the YouTube tab", () => {
    render(<UploadPage />);

    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    fireEvent.click(screen.getByRole("tab", { name: /upload file/i }));

    expect(screen.getByText(/drag and drop an audio file/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/youtube link/i)).not.toBeInTheDocument();
  });
});
