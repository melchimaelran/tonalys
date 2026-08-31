import numpy as np
import pytest
from scipy.io import wavfile

from app.analysis import SAMPLE_RATE


@pytest.fixture
def c_major_120bpm_wav(tmp_path):
    """A synthetic 8s C major chord (C4/E4/G4 sine tones) with a 120 BPM
    click track — deterministic, license-free fixture for the analysis
    pipeline (no real song needed to prove tempo/key/chord extraction
    works end to end)."""
    duration = 8
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    note_frequencies = [261.63, 329.63, 392.00]  # C4, E4, G4
    signal = sum(0.2 * np.sin(2 * np.pi * freq * t) for freq in note_frequencies)

    click_interval_s = 0.5  # 120 BPM
    for click_time in np.arange(0, duration, click_interval_s):
        start = int(click_time * SAMPLE_RATE)
        signal[start : start + 200] += np.hanning(200) * 0.8

    path = tmp_path / "c_major_120bpm.wav"
    wavfile.write(str(path), SAMPLE_RATE, signal.astype(np.float32))

    return str(path)


@pytest.fixture
def silent_wav(tmp_path):
    """A short silent clip — exercises the tempo/key/chord edge case where
    a model finds essentially nothing to work with, without crashing."""
    duration = 2
    signal = np.zeros(int(SAMPLE_RATE * duration), dtype=np.float32)

    path = tmp_path / "silent.wav"
    wavfile.write(str(path), SAMPLE_RATE, signal)

    return str(path)


def _render_chord(freqs: list[float], duration: float, sample_rate: int) -> np.ndarray:
    """A light second-harmonic + fade envelope on top of a plain sine
    stack — proved reliable for chord-cnn-lstm during manual validation,
    unlike bare sine tones (which the model tends to misread as a related
    but different chord, lacking a real instrument's harmonic content)."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    signal = sum(0.15 * np.sin(2 * np.pi * freq * t) for freq in freqs)
    signal += sum(0.03 * np.sin(2 * np.pi * freq * 2 * t) for freq in freqs)

    fade = min(int(sample_rate * 0.05), len(t))
    envelope = np.ones_like(signal)
    envelope[:fade] = np.linspace(0, 1, fade)
    envelope[-fade:] = np.linspace(1, 0, fade)

    return (signal * envelope).astype(np.float32)


@pytest.fixture
def enriched_chords_wav(tmp_path):
    """C major 7th, then C major over an E bass (slash chord) — the two
    "enriched" chord qualities this app explicitly needs beyond plain
    major/minor (ADR-052), rendered as a chord progression a real model
    can actually read (see `_render_chord`)."""
    chord_duration = 2.5
    chords = [
        [261.63, 329.63, 392.00, 493.88],  # C4 E4 G4 B4 — Cmaj7
        [164.81, 261.63, 329.63, 392.00],  # E3 C4 E4 G4 — C/E
    ]
    segments = [_render_chord(freqs, chord_duration, SAMPLE_RATE) for freqs in chords]
    signal = np.concatenate(segments)

    path = tmp_path / "enriched_chords.wav"
    wavfile.write(str(path), SAMPLE_RATE, signal)

    return str(path)
