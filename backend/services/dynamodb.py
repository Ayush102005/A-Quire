"""services/dynamodb.py - Student sessions, progress, gaze event logging, and lesson context.

Tables (created on first run if they don't exist):
  aquire-sessions  : PK = student_id, SK = session_id
  aquire-progress  : PK = student_id, SK = course_id
  aquire-users     : PK = student_id, SK = record_type
  aquire-lessons   : PK = course_id,  SK = lesson_id
"""
import boto3
import logging
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

logger = logging.getLogger("aquire.dynamodb")

_DDB_CLIENT = None
_DDB_RESOURCE = None


def _get_client():
    global _DDB_CLIENT
    if _DDB_CLIENT is None:
        _DDB_CLIENT = boto3.client(
            "dynamodb",
            region_name=os.environ.get("DYNAMODB_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _DDB_CLIENT


def _get_resource():
    global _DDB_RESOURCE
    if _DDB_RESOURCE is None:
        _DDB_RESOURCE = boto3.resource(
            "dynamodb",
            region_name=os.environ.get("DYNAMODB_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _DDB_RESOURCE


def ensure_tables():
    """Create DynamoDB tables if they don't exist (idempotent)."""
    client = _get_client()
    tables = {
        "aquire-sessions": {
            "KeySchema": [
                {"AttributeName": "student_id", "KeyType": "HASH"},
                {"AttributeName": "session_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "student_id", "AttributeType": "S"},
                {"AttributeName": "session_id", "AttributeType": "S"},
            ],
        },
        "aquire-progress": {
            "KeySchema": [
                {"AttributeName": "student_id", "KeyType": "HASH"},
                {"AttributeName": "course_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "student_id", "AttributeType": "S"},
                {"AttributeName": "course_id", "AttributeType": "S"},
            ],
        },
        # New: general user data (profile, checklist, tracks)
        "aquire-users": {
            "KeySchema": [
                {"AttributeName": "student_id", "KeyType": "HASH"},
                {"AttributeName": "record_type", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "student_id", "AttributeType": "S"},
                {"AttributeName": "record_type", "AttributeType": "S"},
            ],
        },
        # Lesson context for AI mentor
        "aquire-lessons": {
            "KeySchema": [
                {"AttributeName": "course_id", "KeyType": "HASH"},
                {"AttributeName": "lesson_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "course_id", "AttributeType": "S"},
                {"AttributeName": "lesson_id", "AttributeType": "S"},
            ],
        },
    }
    for table_name, schema in tables.items():
        try:
            client.create_table(
                TableName=table_name,
                BillingMode="PAY_PER_REQUEST",
                **schema,
            )
            logger.info("DynamoDB table created: %s", table_name)
        except ClientError as e:
            if e.response["Error"]["Code"] != "ResourceInUseException":
                logger.warning("DynamoDB warning creating %s: %s", table_name, e)


# ── User data helpers (aquire-users table) ────────────────────────────────────

def _save_user_record(student_id: str, record_type: str, data: dict):
    """Upsert a record in aquire-users table."""
    try:
        db = _get_resource()
        table = db.Table("aquire-users")
        table.put_item(Item={
            "student_id": student_id,
            "record_type": record_type,
            "data": data,
            "updated_at": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        logger.exception("_save_user_record error (record_type=%s)", record_type)
        raise


def _get_user_record(student_id: str, record_type: str) -> dict:
    """Fetch a record from aquire-users table. Returns {} if not found."""
    try:
        db = _get_resource()
        table = db.Table("aquire-users")
        resp = table.get_item(Key={"student_id": student_id, "record_type": record_type})
        return resp.get("Item", {}).get("data", {})
    except Exception as e:
        logger.warning("_get_user_record error (record_type=%s): %s", record_type, e)
        return {}


def save_user_profile(student_id: str, profile: dict):
    _save_user_record(student_id, "profile", profile)


def get_user_profile(student_id: str) -> dict:
    return _get_user_record(student_id, "profile")


def save_user_checklist(student_id: str, checklist: list):
    _save_user_record(student_id, "checklist", {"items": checklist})


def get_user_checklist(student_id: str) -> list:
    return _get_user_record(student_id, "checklist").get("items", [])


def save_learning_tracks(student_id: str, tracks: list):
    _save_user_record(student_id, "tracks", {"tracks": tracks})


def get_learning_tracks(student_id: str) -> list:
    return _get_user_record(student_id, "tracks").get("tracks", [])



def log_gaze_event(
    student_id: str,
    course_id: str,
    lesson_id: str,
    gaze_state: str,
    ai_response: str,
    emotion: str = "",
    confusion_score: float = 0.0,
):
    """Append a gaze event to the student's current session."""
    try:
        db = _get_resource()
        table = db.Table("aquire-sessions")
        session_id = f"{course_id}#{lesson_id}"
        table.update_item(
            Key={"student_id": student_id, "session_id": session_id},
            UpdateExpression=(
                "SET course_id = :c, lesson_id = :l, last_updated = :ts "
                "ADD event_count :one"
            ),
            ExpressionAttributeValues={
                ":c":   course_id,
                ":l":   lesson_id,
                ":ts":  datetime.utcnow().isoformat(),
                ":one": 1,
            },
        )
        # Log the individual event
        event_id = str(uuid.uuid4())[:8]
        table.update_item(
            Key={"student_id": student_id, "session_id": f"{session_id}#evt#{event_id}"},
            UpdateExpression=(
                "SET gaze_state = :gs, ai_response = :ar, emotion = :em, "
                "confusion_score = :cs, ts = :ts"
            ),
            ExpressionAttributeValues={
                ":gs":  gaze_state,
                ":ar":  ai_response,
                ":em":  emotion,
                ":cs":  str(round(confusion_score, 3)),
                ":ts":  datetime.utcnow().isoformat(),
            },
        )
    except Exception as e:
        logger.warning("log_gaze_event error: %s", e)


def get_student_progress(student_id: str) -> dict:
    """Returns aggregated progress across all courses."""
    try:
        db = _get_resource()
        table = db.Table("aquire-progress")
        resp = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("student_id").eq(student_id)
        )
        return {"items": resp.get("Items", [])}
    except Exception as e:
        logger.warning("get_student_progress error: %s", e)
        return {"items": []}


def mark_topic_complete(student_id: str, course_id: str, topic_id: str):
    """Mark a topic as completed for a student."""
    try:
        db = _get_resource()
        table = db.Table("aquire-progress")
        table.update_item(
            Key={"student_id": student_id, "course_id": course_id},
            UpdateExpression="ADD completed_topics :t SET last_seen = :ts",
            ExpressionAttributeValues={
                ":t":  {topic_id},
                ":ts": datetime.utcnow().isoformat(),
            },
        )
    except Exception as e:
        logger.warning("mark_topic_complete error: %s", e)


def fetch_lesson_context(course_id: str, lesson_id: str) -> dict:
    """Fetch lesson context from DynamoDB aquire-lessons table."""
    try:
        db = _get_resource()
        table = db.Table("aquire-lessons")
        resp = table.get_item(Key={"course_id": course_id, "lesson_id": lesson_id})
        item = resp.get("Item")
        if item:
            return item
    except Exception as e:
        logger.warning("fetch_lesson_context error: %s", e)

    # Fallback if not found
    return {
        "course_id": course_id,
        "lesson_id": lesson_id,
        "title": lesson_id,
        "transcript_summary": f"The student is working on: {lesson_id}.",
        "key_concepts": [lesson_id],
    }
