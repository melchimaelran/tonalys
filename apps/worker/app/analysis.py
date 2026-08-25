from dataclasses import dataclass

import essentia.standard as es

SAMPLE_RATE = 44100


@dataclass
class ChordSegment:
    start_time: float
    end_time: float
    root: str
    chord_type: str


def load_audio(path: str):
    return es.MonoLoader(filename=path, sampleRate=SAMPLE_RATE)()


def extract_tempo(audio) -> float:
    bpm, _ticks, _confidence, _estimates, _intervals = es.RhythmExtractor2013()(audio)
    return float(bpm)


def extract_key(audio) -> tuple[str, str]:
    key, scale, _strength = es.KeyExtractor()(audio)
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


def _parse_chord_label(label: str) -> tuple[str, str]:
    if label == "N":
        return "N", "none"
    if label.endswith("m"):
        return label[:-1], "minor"
    return label, "major"
