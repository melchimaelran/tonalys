from app.youtube import build_ydl_options


def test_no_cookiefile_when_env_unset(monkeypatch):
    monkeypatch.delenv("YT_COOKIES_FILE", raising=False)

    options = build_ydl_options({"quiet": True})

    assert "cookiefile" not in options
    assert options["quiet"] is True


def test_no_cookiefile_when_file_missing(monkeypatch, tmp_path):
    monkeypatch.setenv("YT_COOKIES_FILE", str(tmp_path / "does-not-exist.txt"))

    options = build_ydl_options({"quiet": True})

    assert "cookiefile" not in options


def test_cookiefile_added_when_env_set_and_file_exists(monkeypatch, tmp_path):
    cookie_file = tmp_path / "yt-cookies.txt"
    cookie_file.write_text("# Netscape HTTP Cookie File\n")
    monkeypatch.setenv("YT_COOKIES_FILE", str(cookie_file))

    options = build_ydl_options({"quiet": True})

    assert options["cookiefile"] == str(cookie_file)
    assert options["quiet"] is True


def test_youtube_player_client_fallbacks_always_set(monkeypatch):
    monkeypatch.delenv("YT_COOKIES_FILE", raising=False)

    options = build_ydl_options({"quiet": True})

    player_clients = options["extractor_args"]["youtube"]["player_client"]
    assert "tv" in player_clients
    assert "web_safari" in player_clients


def test_build_ydl_options_keeps_a_caller_supplied_extractor_arg(monkeypatch):
    monkeypatch.delenv("YT_COOKIES_FILE", raising=False)

    options = build_ydl_options(
        {"extractor_args": {"youtube": {"lang": ["en"]}}},
    )

    assert options["extractor_args"]["youtube"]["lang"] == ["en"]
    assert "player_client" in options["extractor_args"]["youtube"]


def test_build_ydl_options_does_not_mutate_input(monkeypatch, tmp_path):
    cookie_file = tmp_path / "yt-cookies.txt"
    cookie_file.write_text("# Netscape HTTP Cookie File\n")
    monkeypatch.setenv("YT_COOKIES_FILE", str(cookie_file))

    base = {"quiet": True, "extractor_args": {"youtube": {"lang": ["en"]}}}
    build_ydl_options(base)

    assert "cookiefile" not in base
    assert base["extractor_args"] == {"youtube": {"lang": ["en"]}}
