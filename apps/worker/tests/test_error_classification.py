from app.youtube import classify_extraction_error


def test_bot_check_is_blocked():
    exc = Exception(
        "ERROR: [youtube] KEI4qSrkPAs: Sign in to confirm you're not a bot. "
        "Use --cookies-from-browser or --cookies for the authentication."
    )

    assert classify_extraction_error(exc) == "blocked"


def test_rate_limit_is_blocked():
    exc = Exception("ERROR: [youtube] abc: HTTP Error 429: Too Many Requests")

    assert classify_extraction_error(exc) == "blocked"


def test_page_reload_is_blocked():
    # YouTube handing yt-dlp a "reload" playability state — transient,
    # not a property of the video, so it's retryable.
    exc = Exception("ERROR: [youtube] abc: The page needs to be reloaded.")

    assert classify_extraction_error(exc) == "blocked"


def test_private_video_is_unavailable():
    exc = Exception("ERROR: [youtube] abc: Private video. Sign in if you've been granted access to this video")

    assert classify_extraction_error(exc) == "unavailable"


def test_removed_video_is_unavailable():
    exc = Exception("ERROR: [youtube] abc: Video unavailable. This video has been removed by the uploader")

    assert classify_extraction_error(exc) == "unavailable"


def test_unknown_error_is_unavailable():
    exc = Exception("ERROR: something entirely unexpected happened")

    assert classify_extraction_error(exc) == "unavailable"
