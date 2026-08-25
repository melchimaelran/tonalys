import os

from app.analysis import extract_chords, load_audio
from app.youtube import download_audio

# "Me at the zoo" — the first video ever uploaded to YouTube, by YouTube's
# own co-founder. Extremely unlikely to ever be taken down (historical
# significance, hosted by YouTube itself), 19s long — a real, deliberately
# stable third-party dependency for this test (see TON-021: no mock here,
# same "real infra" philosophy as the rest of the worker's test suite,
# accepted as a real network dependency rather than mocking yt-dlp).
TEST_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"


def test_download_audio_produces_a_file_the_analysis_pipeline_can_read(tmp_path):
    path = download_audio(TEST_VIDEO_URL, str(tmp_path))

    assert os.path.exists(path)

    audio = load_audio(path)
    assert len(audio) > 0

    # Feeding straight into the existing pipeline is the point of this
    # ticket (AC: "transmis au pipeline d'analyse") — just needs to run
    # without crashing on real extracted audio, not any particular result.
    segments = extract_chords(audio)
    assert isinstance(segments, list)
