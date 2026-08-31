import numpy as np
import pytest
import essentia.standard as es

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
    es.MonoWriter(filename=str(path), sampleRate=SAMPLE_RATE)(signal.astype(np.float32))

    return str(path)


@pytest.fixture
def silent_wav(tmp_path):
    """A short silent clip — exercises the tempo/key edge case where a
    beat/key model finds essentially nothing to work with, without
    crashing."""
    duration = 2
    signal = np.zeros(int(SAMPLE_RATE * duration), dtype=np.float32)

    path = tmp_path / "silent.wav"
    es.MonoWriter(filename=str(path), sampleRate=SAMPLE_RATE)(signal)

    return str(path)
