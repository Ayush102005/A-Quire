"""
services/transcribe.py — Real-time voice-to-text via Amazon Transcribe.

Converts a base64 audio blob (WebM/WAV from browser mic) to text,
supporting both English and Hindi for Hinglish student input.
"""
import boto3
import base64
import logging
import os
import uuid
import time

logger = logging.getLogger("aquire.transcribe")

_TC_CLIENT = None
_TC_S3_CLIENT = None


def _get_client():
    global _TC_CLIENT
    if _TC_CLIENT is None:
        _TC_CLIENT = boto3.client(
            "transcribe",
            region_name=os.environ.get("AWS_REGION", "ap-south-1"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _TC_CLIENT


def _get_s3():
    global _TC_S3_CLIENT
    if _TC_S3_CLIENT is None:
        _TC_S3_CLIENT = boto3.client(
            "s3",
            region_name=os.environ.get("S3_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _TC_S3_CLIENT


def transcribe_audio(audio_b64: str, language_code: str = "en-IN") -> str:
    """
    Transcribes a base64-encoded WebM/WAV audio blob.
    Flow: audio_b64 → upload to S3 temp → Transcribe job → return text.
    
    language_code options:
      "en-IN"  — Indian English (default, handles Hinglish well)
      "hi-IN"  — Hindi
    
    Returns the transcribed text string, or "" on failure.
    """
    bucket = os.environ.get("S3_BUCKET_NAME", "")
    if not bucket:
        logger.warning("S3_BUCKET_NAME not set — transcription skipped")
        return ""

    try:
        # Decode and save audio to temp file
        audio_bytes = base64.b64decode(audio_b64)
        job_id = str(uuid.uuid4())[:8]
        s3_key = f"transcribe-temp/{job_id}.webm"
        job_name = f"aquire-{job_id}"

        # Upload audio to S3
        s3 = _get_s3()
        s3.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=audio_bytes,
            ContentType="audio/webm",
        )

        audio_uri = f"s3://{bucket}/{s3_key}"

        # Start transcription job
        tc = _get_client()
        tc.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": audio_uri},
            MediaFormat="webm",
            LanguageCode=language_code,
        )

        # Poll until done (max 30s for short clips)
        for _ in range(30):
            status = tc.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status["TranscriptionJob"]["TranscriptionJobStatus"]

            if job_status == "COMPLETED":
                transcript_uri = status["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                import urllib.request, json as jsonlib
                with urllib.request.urlopen(transcript_uri) as resp:
                    data = jsonlib.loads(resp.read())
                text = data["results"]["transcripts"][0]["transcript"]

                # Clean up S3 temp file
                try:
                    s3.delete_object(Bucket=bucket, Key=s3_key)
                except Exception:
                    pass

                return text

            elif job_status == "FAILED":
                logger.warning("Transcribe job failed: %s", status)
                break

            time.sleep(1)

        return ""

    except Exception as e:
        logger.exception("transcribe_audio error")
        return ""
