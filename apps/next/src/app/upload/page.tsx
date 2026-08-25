"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { YoutubeLinkForm } from "@/components/youtube-link-form";

type Source = "file" | "youtube";

export default function UploadPage() {
  const [source, setSource] = useState<Source>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Add a track</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2" role="tablist" aria-label="Track source">
            <Button
              type="button"
              variant={source === "file" ? "default" : "outline"}
              size="sm"
              role="tab"
              aria-selected={source === "file"}
              onClick={() => setSource("file")}
            >
              Upload file
            </Button>
            <Button
              type="button"
              variant={source === "youtube" ? "default" : "outline"}
              size="sm"
              role="tab"
              aria-selected={source === "youtube"}
              onClick={() => setSource("youtube")}
            >
              YouTube link
            </Button>
          </div>

          {source === "file" ? (
            <>
              <UploadDropzone onFileSelected={setSelectedFile} />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
              )}
            </>
          ) : (
            <YoutubeLinkForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
