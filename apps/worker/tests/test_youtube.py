import os

from app.analysis import extract_chords
from app.youtube import download_audio, get_video_info

# "Me at the zoo" — the first video ever uploaded to YouTube, by YouTube's
# own co-founder. Extremely unlikely to ever be taken down (historical
# significance, hosted by YouTube itself), 19s long — a real, deliberately
# stable third-party dependency for this test (see TON-021: no mock here,
# same "real infra" philosophy as the rest of the worker's test suite,
# accepted as a real network dependency rather than mocking yt-dlp).
TEST_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

# A syntactically valid but nonexistent video id — yt-dlp reliably fails
# to resolve it without depending on a real video's privacy status ever
# changing (TON-022).
NONEXISTENT_VIDEO_URL = "https://www.youtube.com/watch?v=00000000000"


def test_download_audio_produces_a_file_the_analysis_pipeline_can_read(tmp_path):
    path = download_audio(TEST_VIDEO_URL, str(tmp_path))

    assert os.path.exists(path)

    # Feeding straight into the existing pipeline is the point of this
    # ticket (AC: "transmis au pipeline d'analyse") — just needs to run
    # without crashing on real extracted audio, not any particular result.
    segments = extract_chords(path)
    assert isinstance(segments, list)


def test_get_video_info_returns_title_and_duration_for_a_valid_video():
    info = get_video_info(TEST_VIDEO_URL)

    assert info["available"] is True
    assert info["title"]
    assert 15 <= info["duration_seconds"] <= 25


def test_get_video_info_returns_unavailable_for_a_nonexistent_video():
    info = get_video_info(NONEXISTENT_VIDEO_URL)

    assert info == {
        "available": False,
        "title": None,
        "duration_seconds": None,
        "reason": "unavailable",
    }
