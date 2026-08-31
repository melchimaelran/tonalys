import pytest

from app.chord_labels import parse_chord_cnn_lstm_label


@pytest.mark.parametrize(
    "label,expected",
    [
        # No chord.
        ("N", ("N", "none", None)),
        ("X", ("N", "none", None)),
        # Triads — map 1:1 onto our vocabulary (apps/next/src/lib/notes.ts CHORD_TYPES).
        ("C:maj", ("C", "major", None)),
        ("C:min", ("C", "minor", None)),
        ("C:dim", ("C", "dim", None)),
        ("C:aug", ("C", "aug", None)),
        # Sevenths — the enrichment the app explicitly wants (maj7/min7/dim7).
        ("C:maj7", ("C", "maj7", None)),
        ("C:min7", ("C", "m7", None)),
        ("C:7", ("C", "7", None)),
        ("C:dim7", ("C", "dim7", None)),
        # hdim7 (half-diminished) isn't in our vocabulary — documented
        # approximation to the closest existing type.
        ("C:hdim7", ("C", "dim7", None)),
        # Sus chords — the other enrichment explicitly asked for.
        ("C:sus2", ("C", "sus2", None)),
        ("C:sus4", ("C", "sus4", None)),
        # sus4(b7) isn't in our vocabulary either — drop the 7th detail.
        ("C:sus4(b7)", ("C", "sus4", None)),
        # Ninths.
        ("C:9", ("C", "9", None)),
        ("C:maj9", ("C", "maj9", None)),
        ("C:min9", ("C", "m9", None)),
        # 11ths/13ths aren't in our vocabulary — approximate down to the 9th family.
        ("C:11", ("C", "9", None)),
        ("C:13", ("C", "9", None)),
    ],
)
def test_parses_root_and_quality(label, expected):
    assert parse_chord_cnn_lstm_label(label) == expected


@pytest.mark.parametrize(
    "label,expected_root",
    [
        ("C#:maj", "C#"),
        ("D:maj", "D"),
        ("Eb:maj", "D#"),  # model spells this as a flat — normalized to our sharps convention
        ("F#:maj", "F#"),
        ("Ab:maj", "G#"),
        ("Bb:maj", "A#"),
    ],
)
def test_normalizes_root_spelling_to_sharps(label, expected_root):
    root, _chord_type, _bass = parse_chord_cnn_lstm_label(label)
    assert root == expected_root


@pytest.mark.parametrize(
    "label,expected",
    [
        # Slash chords — bass is a scale-degree offset from the root, not
        # an absolute note name, and needs resolving.
        ("C:maj/3", ("C", "major", "E")),
        ("C:maj/5", ("C", "major", "G")),
        ("G:maj/5", ("G", "major", "D")),
        ("A:min/b3", ("A", "minor", "C")),
        ("C:min/b7", ("C", "minor", "A#")),
        ("C:maj/2", ("C", "major", "D")),
    ],
)
def test_resolves_slash_chord_bass_notes(label, expected):
    assert parse_chord_cnn_lstm_label(label) == expected


def test_falls_back_to_the_raw_token_for_an_unrecognized_quality():
    # Defensive: we only vendor the "submission" chord dictionary, but
    # this shouldn't crash if a stray label from another dict ever shows up.
    assert parse_chord_cnn_lstm_label("C:min11") == ("C", "min11", None)
