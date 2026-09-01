import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UploadDropzone } from "./upload-dropzone";

describe("UploadDropzone", () => {
  it("renders a drop zone with instructions", () => {
    render(<UploadDropzone />);

    expect(screen.getByText(/drag and drop an audio file/i)).toBeInTheDocument();
  });

  it("renders an accessible file input accepting mp3/wav", () => {
    render(<UploadDropzone />);

    const input = screen.getByLabelText(/drag and drop an audio file/i);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".mp3,.wav,audio/mpeg,audio/wav");
  });

  it("shows the accepted format and size limit", () => {
    render(<UploadDropzone />);

    expect(screen.getByText(/mp3 or wav .* up to 20 mb/i)).toBeInTheDocument();
  });

  it("calls onFileSelected with the dropped file", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });

    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows visual feedback while dragging over, and clears it on drag leave", () => {
    render(<UploadDropzone />);
    const dropzone = screen.getByTestId("dropzone");

    expect(dropzone).toHaveAttribute("data-dragging", "false");

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveAttribute("data-dragging", "true");

    fireEvent.dragLeave(dropzone);
    expect(dropzone).toHaveAttribute("data-dragging", "false");
  });

  it("calls onFileSelected with the file picked via the input (tap-to-browse on mobile)", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);
    const file = new File(["audio"], "track.wav", { type: "audio/wav" });
    const input = screen.getByLabelText(/drag and drop an audio file/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("rejects a file with a disallowed extension and shows an error", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);
    const file = new File(["notes"], "notes.txt", { type: "text/plain" });

    fireEvent.change(screen.getByLabelText(/drag and drop an audio file/i), {
      target: { files: [file] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
  });

  it("rejects a file larger than 20 MB and shows an error", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 21 * 1024 * 1024 });

    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [file] } });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(/too large/i)).toBeInTheDocument();
  });

  it("clears a previous error once a valid file is selected", () => {
    const onFileSelected = vi.fn();
    render(<UploadDropzone onFileSelected={onFileSelected} />);
    const input = screen.getByLabelText(/drag and drop an audio file/i);
    const badFile = new File(["notes"], "notes.txt", { type: "text/plain" });
    const goodFile = new File(["audio"], "track.mp3", { type: "audio/mpeg" });

    fireEvent.change(input, { target: { files: [badFile] } });
    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [goodFile] } });

    expect(screen.queryByText(/unsupported file type/i)).not.toBeInTheDocument();
    expect(onFileSelected).toHaveBeenCalledWith(goodFile);
  });
});
