from collections import Counter
from dataclasses import dataclass
from typing import TypeVar

import essentia.standard as es
import numpy as np
from madmom.features.beats import DBNBeatTrackingProcessor, RNNBeatProcessor
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label

_Label = TypeVar("_Label")

SAMPLE_RATE = 44100

# ~1s at hopSize=2048/44100 (~0.046s/frame) — smooths frame-to-frame chord
# flicker (very common on real, produced tracks; essentially absent on a
# clean synthetic single-chord signal) without erasing genuine fast chord
# changes. Tuned against 3 real songs (TON-017/ADR-037) — cut spurious
# sub-300ms segments on one track from 58 down to 5.
CHORD_SMOOTHING_WINDOW_FRAMES = 21


@dataclass
class ChordSegment:
    start_time: float
    end_time: float
    root: str
    chord_type: str


def load_audio(path: str):
    return es.MonoLoader(filename=path, sampleRate=SAMPLE_RATE)()


def extract_tempo(audio_path: str) -> float:
    # madmom (ADR-052): RNN beat-activation → DBN beat tracking, BPM from
    # the median inter-beat interval. Works on a file path, not the
    # essentia-loaded array — a different I/O contract from extract_chords
    # below, which is why this takes audio_path while that takes audio.
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


def extract_chords(audio) -> list[ChordSegment]:
    frame_size = 4096
    hop_size = 2048

    windowing = es.Windowing(type="blackmanharris62")
    spectrum = es.Spectrum()
    spectral_peaks = es.SpectralPeaks()
    hpcp = es.HPCP()
    chords_detection = es.ChordsDetection(hopSize=hop_size, sampleRate=SAMPLE_RATE)

    hpcp_frames = []
    for frame in es.FrameGenerator(
        audio, frameSize=frame_size, hopSize=hop_size, startFromZero=True
    ):
        windowed = windowing(frame)
        spec = spectrum(windowed)
        freqs, mags = spectral_peaks(spec)
        hpcp_frames.append(hpcp(freqs, mags))

    chord_labels, _strengths = chords_detection(hpcp_frames)
    chord_labels = _smooth_labels(list(chord_labels), CHORD_SMOOTHING_WINDOW_FRAMES)

    seconds_per_frame = hop_size / SAMPLE_RATE
    segments: list[ChordSegment] = []
    for index, label in enumerate(chord_labels):
        root, chord_type = _parse_chord_label(label)
        start = index * seconds_per_frame
        end = start + seconds_per_frame

        if (
            segments
            and segments[-1].root == root
            and segments[-1].chord_type == chord_type
        ):
            segments[-1].end_time = end
        else:
            segments.append(ChordSegment(start, end, root, chord_type))

    return segments


def _smooth_labels(labels: list[_Label], window: int) -> list[_Label]:
    """Replace each label with the majority label in its surrounding
    window — a standard denoising pass for frame-level chord recognition
    (real tracks flicker between chords frame to frame far more than a
    human would ever perceive as an actual chord change)."""
    half = window // 2
    smoothed = []
    for index in range(len(labels)):
        lo = max(0, index - half)
        hi = min(len(labels), index + half + 1)
        neighborhood = labels[lo:hi]
        smoothed.append(Counter(neighborhood).most_common(1)[0][0])
    return smoothed


def _parse_chord_label(label: str) -> tuple[str, str]:
    if label == "N":
        return "N", "none"
    if label.endswith("m"):
        return label[:-1], "minor"
    return label, "major"
