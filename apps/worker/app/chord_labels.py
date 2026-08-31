"""Maps chord-cnn-lstm's `.lab` chord labels onto the app's own chord
vocabulary (apps/next/src/lib/notes.ts CHORD_TYPES) — see ADR-052."""

CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# chord-cnn-lstm spells some roots as flats — normalize to our sharps
# convention (mirrors apps/next/src/lib/notes.ts FLAT_ALIASES).
ROOT_ALIASES = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}

# Scale-degree offset (semitones from the root) used in the model's slash
# notation, e.g. "C:maj/5" = C major with its 5th (G) as the bass.
INTERVAL_SEMITONES = {"2": 2, "b3": 3, "3": 4, "4": 5, "5": 7, "b7": 10, "7": 11}

# Only the qualities the vendored "submission" chord dictionary can
# actually produce (apps/worker/vendor/chord_cnn_lstm/data/submission_chord_list.txt).
# Most map 1:1 onto our vocabulary; hdim7/sus4(b7)/11/13 aren't in it, so
# they're approximated down to the closest existing type rather than left
# unhandled.
CHORD_QUALITY_MAP = {
    "maj": "major",
    "min": "minor",
    "dim": "dim",
    "aug": "aug",
    "dim7": "dim7",
    "hdim7": "dim7",
    "sus2": "sus2",
    "sus4": "sus4",
    "sus4(b7)": "sus4",
    "7": "7",
    "min7": "m7",
    "maj7": "maj7",
    "9": "9",
    "maj9": "maj9",
    "min9": "m9",
    "11": "9",
    "13": "9",
}


def _normalize_root(name: str) -> str:
    return ROOT_ALIASES.get(name, name)


def _shift_root(root: str, semitones: int) -> str:
    index = CHROMATIC_SCALE.index(root)
    return CHROMATIC_SCALE[(index + semitones) % 12]


def parse_chord_cnn_lstm_label(label: str) -> tuple[str, str, str | None]:
    """Parse a chord-cnn-lstm `.lab` label into `(root, chord_type,
    bass_note)`. `label` looks like "C:maj7", "G:maj/5" (slash chord — the
    part after "/" is a scale-degree offset, not an absolute note name),
    or "N"/"X" (no chord)."""
    label = label.strip()
    if label in ("N", "X"):
        return "N", "none", None

    root_part, _, rest = label.partition(":")
    root = _normalize_root(root_part)

    quality_part, _, interval_part = rest.partition("/")
    chord_type = CHORD_QUALITY_MAP.get(quality_part, quality_part)

    bass_note = None
    if interval_part:
        semitones = INTERVAL_SEMITONES.get(interval_part)
        if semitones is not None:
            bass_note = _shift_root(root, semitones)

    return root, chord_type, bass_note
