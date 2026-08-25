"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Upload a track</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UploadDropzone onFileSelected={setSelectedFile} />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
