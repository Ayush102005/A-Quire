"""
services/cloudwatch.py — Custom CloudWatch metrics for A-Quire analytics.

Metrics emitted per gaze event:
  - GazeEventCount     (dimension: State=confused|distracted)
  - KiroResponseLatency (ms)
  - ConfusionScore      (0-100, from Rekognition)
  - SessionActiveStudents (gauge)
"""
import boto3
import logging
import os
from datetime import datetime

logger = logging.getLogger("aquire.cloudwatch")

NAMESPACE = "AQuire/KiroMentor"

_CW_CLIENT = None


def _get_client():
    global _CW_CLIENT
    if _CW_CLIENT is None:
        _CW_CLIENT = boto3.client(
            "cloudwatch",
            region_name=os.environ.get("AWS_REGION", "ap-south-1"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _CW_CLIENT


def emit_gaze_event(gaze_state: str, latency_ms: float, confusion_score: float = 0.0):
    """
    Emits custom metrics for a gaze event.
    Safe to call — silently swallows errors so it never breaks the main flow.
    """
    try:
        cw = _get_client()
        now = datetime.utcnow()

        metric_data = [
            {
                "MetricName": "GazeEventCount",
                "Dimensions": [{"Name": "State", "Value": gaze_state}],
                "Timestamp": now,
                "Value": 1,
                "Unit": "Count",
            },
            {
                "MetricName": "KiroResponseLatencyMs",
                "Dimensions": [{"Name": "State", "Value": gaze_state}],
                "Timestamp": now,
                "Value": latency_ms,
                "Unit": "Milliseconds",
            },
        ]

        if confusion_score > 0:
            metric_data.append({
                "MetricName": "FaceConfusionScore",
                "Dimensions": [{"Name": "Source", "Value": "Rekognition"}],
                "Timestamp": now,
                "Value": confusion_score * 100,   # Store as 0-100
                "Unit": "None",
            })

        cw.put_metric_data(Namespace=NAMESPACE, MetricData=metric_data)

    except Exception as e:
        logger.warning("emit_gaze_event error (non-fatal): %s", e)


def emit_session_start(student_id: str, course_id: str):
    """Emits a session start event — used to track active learners."""
    try:
        cw = _get_client()
        cw.put_metric_data(
            Namespace=NAMESPACE,
            MetricData=[{
                "MetricName": "SessionStart",
                "Dimensions": [{"Name": "CourseId", "Value": course_id}],
                "Timestamp": datetime.utcnow(),
                "Value": 1,
                "Unit": "Count",
            }],
        )
    except Exception as e:
        logger.warning("emit_session_start error (non-fatal): %s", e)
