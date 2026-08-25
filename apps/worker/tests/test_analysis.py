from app.analysis import extract_chords, extract_key, extract_tempo, load_audio


def test_extract_tempo_detects_120bpm(c_major_120bpm_wav):
    audio = load_audio(c_major_120bpm_wav)

    tempo = extract_tempo(audio)

    assert 115 <= tempo <= 125


def test_extract_key_detects_c_major(c_major_120bpm_wav):
    audio = load_audio(c_major_120bpm_wav)

    key, scale = extract_key(audio)

    assert key == "C"
    assert scale == "major"


def test_extract_chords_detects_a_single_c_major_segment(c_major_120bpm_wav):
    audio = load_audio(c_major_120bpm_wav)

    segments = extract_chords(audio)

    assert len(segments) == 1
    assert segments[0].root == "C"
    assert segments[0].chord_type == "major"
    assert segments[0].start_time == 0.0
    assert segments[0].end_time > 7.0
