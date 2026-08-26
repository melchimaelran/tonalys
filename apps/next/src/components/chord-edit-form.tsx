"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHROMATIC_SCALE } from "@/lib/notes";

const CHORD_TYPES = ["major", "minor"];

export interface ChordEditFormProps {
  root: string;
  chordType: string;
  onSave: (root: string, chordType: string) => void;
  onCancel: () => void;
}

export function ChordEditForm({ root, chordType, onSave, onCancel }: ChordEditFormProps) {
  const [editedRoot, setEditedRoot] = useState(root);
  const [editedChordType, setEditedChordType] = useState(chordType);

  const selectClassName =
    "h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Root"
        value={editedRoot}
        onChange={(event) => setEditedRoot(event.target.value)}
        className={selectClassName}
      >
        {CHROMATIC_SCALE.map((note) => (
          <option key={note} value={note}>
            {note}
          </option>
        ))}
      </select>
      <select
        aria-label="Chord type"
        value={editedChordType}
        onChange={(event) => setEditedChordType(event.target.value)}
        className={selectClassName}
      >
        {CHORD_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" onClick={() => onSave(editedRoot, editedChordType)}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
