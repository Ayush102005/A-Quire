"""
app/core/websocket_manager.py
──────────────────────────────
In-memory WebSocket connection registry.

Maintains a {user_id: [WebSocket, ...]} map so the backend can push
notifications to a specific user from any endpoint (e.g. after AI hint
generation or course publish).

Usage:
    from app.core.websocket_manager import ws_manager

    # In the /ws/notifications endpoint:
    await ws_manager.connect(user_id, websocket)
    await ws_manager.broadcast_to_user(user_id, {"type": "hint", "text": "..."})
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict

from fastapi import WebSocket

# Cap on a single ws.send_text() call. Without this, a stale connection still
# sitting in the registry (client's machine slept, network changed, tab
# closed without a clean handshake) can leave send_text() waiting on a dead
# TCP socket for a very long time — and every caller of broadcast_to_user()
# (submit_answer, generate_hint, notifications, ...) awaits it directly, so
# that hang propagates straight into the HTTP response the frontend is
# waiting on (e.g. a quiz answer submission stuck on "Checking..." forever).
_SEND_TIMEOUT_SECONDS = 5


class WebSocketManager:
    def __init__(self) -> None:
        # user_id → list of active WebSocket connections (supports multiple tabs)
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        """Register an already-accepted WebSocket connection for the given user.

        Does NOT call websocket.accept() itself — the caller (ws.py's
        notifications_ws) accepts deliberately after authentication
        succeeds, so it can send a proper close frame via
        close_policy_violation() on a bad token instead of rejecting the
        handshake outright. Calling accept() a second time here made
        Starlette raise ("Expected ASGI message 'websocket.send' or
        'websocket.close', but got 'websocket.accept'") on every single
        connection, immediately killing it right after the handshake
        completed — this was a 100%-reproducible bug, not a network issue.
        """
        async with self._lock:
            self._connections[user_id].append(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        """Remove a WebSocket connection (called on close or error)."""
        async with self._lock:
            sockets = self._connections.get(user_id, [])
            if websocket in sockets:
                sockets.remove(websocket)
            if not sockets:
                self._connections.pop(user_id, None)

    async def broadcast_to_user(self, user_id: int, data: dict) -> None:
        """
        Push a JSON message to all active connections for a user.
        Dead connections are cleaned up automatically.
        """
        message = json.dumps(data)
        async with self._lock:
            sockets = list(self._connections.get(user_id, []))

        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await asyncio.wait_for(ws.send_text(message), timeout=_SEND_TIMEOUT_SECONDS)
            except Exception:
                dead.append(ws)

        # Clean up dead sockets
        for ws in dead:
            await self.disconnect(user_id, ws)

    def is_connected(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))


# Module-level singleton — import this everywhere
ws_manager = WebSocketManager()
