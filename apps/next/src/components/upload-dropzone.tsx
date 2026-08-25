"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".mp3", ".wav"];

function isAcceptedFile(file: File) {
  return ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));
}

interface UploadDropzoneProps {
  onFileSelected?: (file: File) => void;
}

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function processFile(file: File) {
    if (!isAcceptedFile(file)) {
      setError("Unsupported file type — please choose an MP3 or WAV file");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large — maximum size is 20 MB");
      return;
    }
    setError(null);
    onFileSelected?.(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div
      data-testid="dropzone"
      data-dragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragging ? "border-primary bg-accent" : "border-input",
      )}
    >
      <label htmlFor="audio-file" className="cursor-pointer text-sm font-medium">
        Drag and drop an audio file here, or click to browse
        <input
          id="audio-file"
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          className="sr-only"
          onChange={handleChange}
        />
      </label>
      <p className="text-xs text-muted-foreground">MP3 or WAV, up to 20 MB</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
