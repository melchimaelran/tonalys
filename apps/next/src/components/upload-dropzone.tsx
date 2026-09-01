"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react";
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

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
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
    // The whole box is the label, so a click (or tap) anywhere in it opens
    // the file picker — not just on the text.
    <label
      htmlFor="audio-file"
      data-testid="dropzone"
      data-dragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-10 text-center transition-colors focus-within:border-primary",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/40 hover:bg-foreground/[0.02]",
      )}
    >
      <UploadSimple
        aria-hidden
        className={cn(
          "size-7 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span className="text-sm font-medium">
        Drag and drop an audio file here, or click to browse
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        MP3 or WAV · up to 20 MB
      </span>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <input
        id="audio-file"
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        className="sr-only"
        onChange={handleChange}
      />
    </label>
  );
}
