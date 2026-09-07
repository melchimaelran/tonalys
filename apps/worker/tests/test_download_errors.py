import pytest
import yt_dlp

from app.youtube import YoutubeDownloadError, download_audio


def test_user_message_for_a_blocked_download_is_the_try_again_wording():
    err = YoutubeDownloadError("blocked", "ERROR: [youtube] abc: The page needs to be reloaded.")

    assert "temporarily unavailable" in err.user_message.lower()
    assert "[youtube]" not in err.user_message


def test_user_message_for_an_unavailable_download_is_plain_english():
    err = YoutubeDownloadError("unavailable", "ERROR: [youtube] abc: Private video.")

    assert "[youtube]" not in err.user_message
    assert "ERROR:" not in err.user_message


def test_download_audio_wraps_a_bot_check_downloaderror_as_blocked(monkeypatch, tmp_path):
    class FakeYoutubeDL:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def extract_info(self, *_args, **_kwargs):
            raise yt_dlp.utils.DownloadError(
                "ERROR: [youtube] abc: Sign in to confirm you're not a bot."
            )

    monkeypatch.setattr(yt_dlp, "YoutubeDL", FakeYoutubeDL)

    with pytest.raises(YoutubeDownloadError) as excinfo:
        download_audio("https://www.youtube.com/watch?v=abc12345678", str(tmp_path))

    assert excinfo.value.reason == "blocked"


def test_download_audio_wraps_a_private_video_downloaderror_as_unavailable(monkeypatch, tmp_path):
    class FakeYoutubeDL:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def extract_info(self, *_args, **_kwargs):
            raise yt_dlp.utils.DownloadError("ERROR: [youtube] abc: Private video.")

    monkeypatch.setattr(yt_dlp, "YoutubeDL", FakeYoutubeDL)

    with pytest.raises(YoutubeDownloadError) as excinfo:
        download_audio("https://www.youtube.com/watch?v=abc12345678", str(tmp_path))

    assert excinfo.value.reason == "unavailable"
