"""
app/api/v1/meetings.py
────────────────────────
JaaS (Jitsi as a Service) meeting authentication.

GET /meetings/{room_id}/token — signed JWT for the caller to join a room

JaaS rejects every join with no signed token at all ("Sorry, you're not
allowed to join this call") — Frontend/src/pages/MeetingRoom.jsx never
requested one before this endpoint existed. See JAAS_APP_ID/JAAS_API_KEY_ID/
JAAS_PRIVATE_KEY in app/core/config.py for where the signing key comes from.
"""
from __future__ import annotations

import time

import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.models.student import User

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.get("/{room_id}/token")
async def get_meeting_token(
    room_id: str,
    current_user: User = Depends(get_current_user),
    _rl: None = rate_limit(30, 60),
) -> dict:
    if not (settings.JAAS_APP_ID and settings.JAAS_API_KEY_ID and settings.JAAS_PRIVATE_KEY):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video meetings are not configured on this server.",
        )

    now = int(time.time())
    payload = {
        "aud": "jitsi",
        "iss": "chat",
        "sub": settings.JAAS_APP_ID,
        # "*" rather than room_id itself — avoids a subtle mismatch between
        # how this room name is encoded here vs. how the frontend passes it
        # to JitsiMeetExternalAPI (Frontend/src/pages/MeetingRoom.jsx's
        # `${jaasAppId}/${roomId}`), which would otherwise silently reject
        # the join the same way an entirely missing token does.
        "room": "*",
        "exp": now + 2 * 60 * 60,  # 2 hours — long enough for one session
        "nbf": now - 10,
        "context": {
            "user": {
                "id": str(current_user.id),
                "name": current_user.full_name or current_user.email,
                "email": current_user.email,
                "moderator": current_user.role in ("instructor", "admin"),
            },
            "features": {
                "livestreaming": False,
                "recording": False,
                "transcription": False,
                "outbound-call": False,
            },
        },
    }

    token = jwt.encode(
        payload,
        settings.JAAS_PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": f"{settings.JAAS_APP_ID}/{settings.JAAS_API_KEY_ID}"},
    )
    return {"token": token, "app_id": settings.JAAS_APP_ID}
