from app.youtube import build_ydl_options


def test_no_pot_provider_arg_when_env_unset(monkeypatch):
    monkeypatch.delenv("BGUTIL_POT_BASE_URL", raising=False)

    options = build_ydl_options({"quiet": True})

    assert "youtubepot-bgutilhttp" not in options["extractor_args"]


def test_pot_provider_base_url_wired_into_extractor_args(monkeypatch):
    monkeypatch.setenv("BGUTIL_POT_BASE_URL", "http://pot-provider:4416")

    options = build_ydl_options({"quiet": True})

    assert options["extractor_args"]["youtubepot-bgutilhttp"] == {
        "base_url": ["http://pot-provider:4416"],
    }
    # the youtube player-client args are still there
    assert "player_client" in options["extractor_args"]["youtube"]


def test_pot_provider_env_is_stripped(monkeypatch):
    monkeypatch.setenv("BGUTIL_POT_BASE_URL", "  http://pot-provider:4416/  ")

    options = build_ydl_options({"quiet": True})

    assert options["extractor_args"]["youtubepot-bgutilhttp"]["base_url"] == [
        "http://pot-provider:4416",
    ]
