# chord-cnn-lstm (vendored)

Vendored subset of [ptnghia-j/chord-cnn-lstm-model](https://github.com/ptnghia-j/chord-cnn-lstm-model)
at commit `35619f70b920996746125fd14f2661467349a80c` — itself a fork of
[music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition](https://github.com/music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition).
MIT licensed (see `LICENSE`). Used here per ADR-052 (`project/tonalys-adr.md`)
as the chord-recognition engine, following ChordMiniApp's implementation as
a methodology reference (ADR-013).

## Why vendored, not a git submodule or pip dependency

- Not published on PyPI — it's a research codebase, not a packaged library.
- No existing submodule convention in this repo; a plain vendored copy is
  simpler for a solo project (no submodule init/update step for anyone
  cloning the repo, no separate versioning to track).

## What's included

Only the files actually loaded during inference — traced empirically via
`sys.modules` after a real `chord_recognition()` call, not guessed from
reading the source. Excludes everything training/eval-only (`datasets.py`,
`storage_creation.py`, `results*.py`, `test_for_all.py`,
`train_eval_test_split.py`'s own CLI usage, etc. — `train_eval_test_split.py`
itself is kept since something in the import chain pulls it in, even though
we never call its functions).

- `chord_recognition.py` — entry point (`chord_recognition(audio_path, lab_path, chord_dict)`).
- `chordnet_ismir_naive.py`, `complex_chord.py`, `settings.py` — model definition + chord-label encoding.
- `extractors/` — CQT feature extraction (librosa-backed, 22050 Hz) + the XHMM decoder.
- `io_new/`, `mir/` — the repo's own small I/O/data framework the above depends on.
- `data/submission_chord_list.txt` — the chord dictionary template used
  (25 labels × 12 roots) — this repo only vendors the `submission` dict
  (ChordMiniApp's own default; best coverage of the chord types Tonalys
  needs — see `app/chord_labels.py`), not the other three (`full`,
  `extended`, `ismir2017`) the upstream repo also ships.
- `cache_data/*.sdict` — the 5 pretrained model checkpoints (~5.7 MB each,
  ~29 MB total), ensembled at inference time.

## Output format

`chord_recognition()` writes a `.lab` file: one `start_seconds\tend_seconds\tlabel`
line per segment, already merged/smoothed by the model's own HMM decoder
(no additional frame-smoothing needed on our side, unlike the previous
Essentia pipeline). Labels look like `C:maj7`, `G:maj/5` (slash chord —
`/5` is a scale-degree offset, not an absolute note name), or `N` (no
chord). `app/chord_labels.py` parses these into our `(root, chord_type,
bass_note)` shape.
