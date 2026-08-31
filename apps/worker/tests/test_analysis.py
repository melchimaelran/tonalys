from app.analysis import extract_chords, extract_key, extract_tempo


def test_extract_tempo_detects_120bpm(c_major_120bpm_wav):
    tempo = extract_tempo(c_major_120bpm_wav)

    assert 115 <= tempo <= 125


def test_extract_tempo_handles_near_silence_without_crashing(silent_wav):
    tempo = extract_tempo(silent_wav)

    assert tempo >= 0.0


def test_extract_key_detects_c_major(c_major_120bpm_wav):
    key, scale = extract_key(c_major_120bpm_wav)

    assert key == "C"
    assert scale == "major"


def test_extract_key_handles_near_silence_without_crashing(silent_wav):
    key, scale = extract_key(silent_wav)

    assert isinstance(key, str) and key
    assert scale in ("major", "minor")


def test_extract_chords_detects_a_single_c_major_segment(c_major_120bpm_wav):
    segments = extract_chords(c_major_120bpm_wav)

    named_segments = [s for s in segments if s.chord_type != "none"]
    assert len(named_segments) == 1
    assert named_segments[0].root == "C"
    assert named_segments[0].chord_type == "major"
    assert named_segments[0].end_time - named_segments[0].start_time > 6.0


def test_extract_chords_handles_near_silence_without_crashing(silent_wav):
    segments = extract_chords(silent_wav)

    assert all(isinstance(s.root, str) and s.root for s in segments)


def test_extract_chords_detects_maj7_and_a_slash_chord(enriched_chords_wav):
    # The two "enriched" chord qualities ADR-052 explicitly asks for
    # beyond plain major/minor, run through the real model end to end
    # (chord_labels.py's mapping itself is exhaustively covered in
    # test_chord_labels.py — this proves the two are wired up correctly).
    segments = extract_chords(enriched_chords_wav)
    named_segments = [s for s in segments if s.chord_type != "none"]

    assert named_segments[0].root == "C"
    assert named_segments[0].chord_type == "maj7"
    assert named_segments[0].bass_note is None

    assert named_segments[1].root == "C"
    assert named_segments[1].chord_type == "major"
    assert named_segments[1].bass_note == "E"
