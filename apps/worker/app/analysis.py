import os
import sys
import tempfile
from dataclasses import dataclass

import numpy as np
from madmom.features.beats import DBNBeatTrackingProcessor, RNNBeatProcessor
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label

from app.chord_labels import parse_chord_cnn_lstm_label

SAMPLE_RATE = 44100

# The vendored chord-cnn-lstm model (ADR-052) — a research codebase, not a
# package, so it needs its own directory on sys.path. Some of its modules
# also read data files with paths relative to the current working
# directory at *import* time (not just call time), hence the chdir below —
# mirrors ChordMiniApp's own integration of the same model.
_VENDOR_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "vendor", "chord_cnn_lstm")
)
# Only the "submission" chord dictionary is vendored (best coverage of our
# vocabulary — see apps/worker/vendor/chord_cnn_lstm/README.md).
CHORD_DICT = "submission"


@dataclass
class ChordSegment:
    start_time: float
    end_time: float
    root: str
    chord_type: str
    bass_note: str | None = None


def extract_tempo(audio_path: str) -> float:
    # madmom (ADR-052): RNN beat-activation → DBN beat tracking, BPM from
    # the median inter-beat interval. Works on a file path, not an
    # in-memory array — same I/O contract as extract_key/extract_chords
    # below (all three load the file themselves).
    beat_activation = RNNBeatProcessor()(audio_path)
    beats = DBNBeatTrackingProcessor(fps=100)(beat_activation)

    if len(beats) < 2:
        return 0.0

    median_interval = float(np.median(np.diff(beats)))
    return 60.0 / median_interval if median_interval > 0 else 0.0


def extract_key(audio_path: str) -> tuple[str, str]:
    # madmom (ADR-052): CNN key classifier over 24 labels (e.g. "C major").
    prediction = CNNKeyRecognitionProcessor()(audio_path)
    label = key_prediction_to_label(prediction)
    key, scale = label.rsplit(" ", 1)
    return key, scale


def extract_chords(audio_path: str) -> list[ChordSegment]:
    # chord-cnn-lstm (ADR-052): CQT features → 5-model ensemble → HMM
    # decoding, already segmented/smoothed by the model itself (unlike the
    # previous Essentia pipeline — no extra frame-smoothing pass needed
    # here). Writes a `start end label` .lab file; parsed below via
    # chord_labels.parse_chord_cnn_lstm_label.
    original_cwd = os.getcwd()
    original_path = list(sys.path)
    try:
        sys.path.insert(0, _VENDOR_DIR)
        os.chdir(_VENDOR_DIR)
        from chord_recognition import chord_recognition

        with tempfile.NamedTemporaryFile(suffix=".lab", delete=False) as tmp:
            lab_path = tmp.name
        try:
            success = chord_recognition(audio_path, lab_path, CHORD_DICT)
            if not success:
                raise RuntimeError("chord-cnn-lstm chord recognition failed")
            return _parse_lab_file(lab_path)
        finally:
            os.unlink(lab_path)
    finally:
        os.chdir(original_cwd)
        sys.path[:] = original_path


def _parse_lab_file(lab_path: str) -> list[ChordSegment]:
    segments = []
    with open(lab_path) as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) != 3:
                continue
            start_time, end_time, label = parts
            root, chord_type, bass_note = parse_chord_cnn_lstm_label(label)
            segments.append(
                ChordSegment(float(start_time), float(end_time), root, chord_type, bass_note)
            )
    return segments
