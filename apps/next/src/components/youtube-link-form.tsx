"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// www. is only ever valid on youtube.com — youtu.be has no www subdomain.
const YOUTUBE_URL_PATTERN =
  /^https?:\/\/((www\.)?youtube\.com\/watch\?v=[\w-]{11}(&\S*)?|youtu\.be\/[\w-]{11}(\?\S*)?)$/;

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url.trim());
}

interface YoutubeLinkFormProps {
  onUrlSubmitted?: (url: string) => void;
}

export function YoutubeLinkForm({ onUrlSubmitted }: YoutubeLinkFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!isValidYoutubeUrl(trimmedUrl)) {
      setError("Enter a valid YouTube video URL");
      return;
    }

    setError(null);
    onUrlSubmitted?.(trimmedUrl);
  }

  return (
    // noValidate: type="url" triggers the browser's own constraint
    // validation on submit, which silently blocks non-URL-shaped input
    // (e.g. "not a url") before handleSubmit ever runs — we want our own
    // message for that case too, not a browser-native one.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <Label htmlFor="youtube-url">YouTube link</Label>
      <Input
        id="youtube-url"
        type="url"
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=..."
        value={url}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit">Analyze</Button>
    </form>
  );
}
