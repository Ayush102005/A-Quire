"""
app/api/v1/ws.py
WebSocket endpoint for real-time notifications.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_token
from app.core.websocket_manager import ws_manager
from app.db.session import AsyncSessionLocal
from app.models.student import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

_WS_POLICY_VIOLATION = 1008
_WS_INTERNAL_ERROR = 1011
_PING_INTERVAL = 30


async def close_policy_violation(websocket: WebSocket) -> None:
    """
    Accept first so the client receives a proper WebSocket close frame.
    """
    try:
        await websocket.accept()
    except Exception:
        pass

    try:
        await websocket.close(code=_WS_POLICY_VIOLATION)
    except Exception:
        pass


@router.websocket("/ws/notifications")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
) -> None:
    user_id: int | None = None
    connected = False

    try:
        # Authenticate before registering the connection.
        try:
            payload = decode_token(token)

            if payload.get("type") != "access":
                logger.warning("[ws] rejected token: invalid token type")
                await close_policy_violation(websocket)
                return

            user_id = int(payload["sub"])

        except (JWTError, ValueError, KeyError, TypeError):
            logger.warning("[ws] rejected token: invalid or expired token")
            await close_policy_violation(websocket)
            return

        # Verify that the user exists and is active.
        async with AsyncSessionLocal() as db:
            user: User | None = await db.get(User, user_id)

        if user is None or not user.is_active:
            logger.warning("[ws] rejected token: inactive/missing user %s", user_id)
            await close_policy_violation(websocket)
            return

        # Accept only after authentication succeeds.
        await websocket.accept()
        connected = True
        logger.info("[ws] connected user_id=%s", user_id)

        await ws_manager.connect(user_id, websocket)

        while True:
            try:
                await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=_PING_INTERVAL,
                )
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    logger.info("[ws] ping failed; closing user_id=%s", user_id)
                    break

    except WebSocketDisconnect:
        logger.info("[ws] disconnected user_id=%s", user_id)

    except Exception:
        logger.exception("[ws] unexpected handler error user_id=%s", user_id)

        if not connected:
            try:
                await websocket.close(code=_WS_INTERNAL_ERROR)
            except Exception:
                pass

    finally:
        if user_id is not None:
            try:
                await ws_manager.disconnect(user_id, websocket)
            except Exception:
                logger.exception(
                    "[ws] manager cleanup failed user_id=%s",
                    user_id,
                )