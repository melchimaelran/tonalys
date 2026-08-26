"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHORD_TYPES, CHROMATIC_SCALE } from "@/lib/notes";

const NO_BASS_NOTE = "";

export interface ChordEditFormProps {
  root: string;
  chordType: string;
  bassNote?: string | null;
  onSave: (root: string, chordType: string, bassNote: string | null) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ChordEditForm({
  root,
  chordType,
  bassNote,
  onSave,
  onCancel,
  isSaving = false,
}: ChordEditFormProps) {
  const [editedRoot, setEditedRoot] = useState(root);
  const [editedChordType, setEditedChordType] = useState(chordType);
  const [editedBassNote, setEditedBassNote] = useState(bassNote ?? NO_BASS_NOTE);

  const selectClassName =
    "h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

  function handleSave() {
    onSave(editedRoot, editedChordType, editedBassNote || null);
  }

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
      <select
        aria-label="Bass note"
        value={editedBassNote}
        onChange={(event) => setEditedBassNote(event.target.value)}
        className={selectClassName}
      >
        <option value={NO_BASS_NOTE}>—</option>
        {CHROMATIC_SCALE.map((note) => (
          <option key={note} value={note}>
            {note}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
