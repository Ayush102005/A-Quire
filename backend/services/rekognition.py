"""
services/rekognition.py — Facial emotion analysis via Amazon Rekognition.

Analyzes webcam snapshots to detect student emotional state (CONFUSED, SURPRISED,
CALM, SAD, etc.) as a complementary signal to iris-based gaze tracking.
"""
import boto3
import base64
import logging
import os
from typing import Optional

logger = logging.getLogger("aquire.rekognition")

_REK_CLIENT = None


def _get_client():
    global _REK_CLIENT
    if _REK_CLIENT is None:
        _REK_CLIENT = boto3.client(
            "rekognition",
            region_name=os.environ.get("REKOGNITION_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _REK_CLIENT


# Map Rekognition emotions → our confusion/distraction signals
CONFUSION_EMOTIONS = {"CONFUSED", "SURPRISED", "DISGUSTED", "FEAR"}
DISTRACTION_EMOTIONS = {"HAPPY", "CALM"}  # calm + looking away = distracted


def analyze_face_emotion(image_b64: str) -> dict:
    """
    Takes a base64 JPEG image and returns:
    {
        "dominant_emotion": "CONFUSED",
        "confidence": 87.4,
        "confusion_score": 0.87,   # 0-1, for feeding into LLM context
        "all_emotions": { "CONFUSED": 87.4, "CALM": 5.1, ... }
    }
    Falls back to empty dict if Rekognition can't detect a face.
    """
    if not image_b64:
        return {}

    try:
        rek = _get_client()
        image_bytes = base64.b64decode(image_b64)

        response = rek.detect_faces(
            Image={"Bytes": image_bytes},
            Attributes=["ALL"],
        )

        if not response.get("FaceDetails"):
            return {"dominant_emotion": "UNKNOWN", "confidence": 0.0, "confusion_score": 0.0}

        # Take the first (most prominent) face
        face = response["FaceDetails"][0]
        emotions = face.get("Emotions", [])

        if not emotions:
            return {}

        # Sort by confidence
        sorted_emotions = sorted(emotions, key=lambda e: e["Confidence"], reverse=True)
        dominant = sorted_emotions[0]

        all_emotions = {e["Type"]: round(e["Confidence"], 1) for e in emotions}

        # Compute a scalar confusion score (weighted sum of confusion-indicating emotions)
        confusion_score = sum(
            e["Confidence"] / 100.0
            for e in emotions
            if e["Type"] in CONFUSION_EMOTIONS
        )
        confusion_score = min(round(confusion_score, 3), 1.0)

        return {
            "dominant_emotion": dominant["Type"],
            "confidence": round(dominant["Confidence"], 1),
            "confusion_score": confusion_score,
            "all_emotions": all_emotions,
        }

    except Exception as e:
        logger.warning("analyze_face_emotion error: %s", e)
        return {}
