from unittest.mock import AsyncMock, patch

import pytest

from app.main import app


@pytest.mark.anyio
async def test_closes_connection_if_channel_setup_fails():
    connection = AsyncMock()
    connection.channel.side_effect = RuntimeError("channel setup failed")

    with patch("app.main.aio_pika.connect_robust", return_value=connection):
        with pytest.raises(RuntimeError, match="channel setup failed"):
            async with app.router.lifespan_context(app):
                pass

    connection.close.assert_awaited_once()
