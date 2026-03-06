import boto3
import json
import logging
import os
from typing import Dict, Any

logger = logging.getLogger("aquire.s3")

_S3_CLIENT = None


def _get_s3():
    global _S3_CLIENT
    if _S3_CLIENT is None:
        _S3_CLIENT = boto3.client(
            "s3",
            region_name=os.environ.get("S3_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _S3_CLIENT


def fetch_lesson_context(course_id: str, lesson_id: str) -> Dict[str, Any]:
    """
    Fetches lesson metadata from S3.
    Expected S3 key: {course_id}/{lesson_id}.json
    Falls back to a generic context if the bucket isn't configured yet.
    """
    bucket = os.environ.get("S3_BUCKET_NAME", "")

    if bucket:
        try:
            s3 = _get_s3()
            key = f"{course_id}/{lesson_id}.json"
            obj = s3.get_object(Bucket=bucket, Key=key)
            return json.loads(obj["Body"].read())
        except Exception as e:
            logger.warning("Could not fetch lesson context (%s): %s", key, e)

    # Fallback — generic context based on lesson_id
    return {
        "course_id": course_id,
        "lesson_id": lesson_id,
        "title": lesson_id.replace("-", " ").title(),
        "transcript_summary": f"The student is working on: {lesson_id}.",
        "key_concepts": [lesson_id],
    }
