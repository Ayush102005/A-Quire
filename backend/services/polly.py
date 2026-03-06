import boto3
import logging
import os

logger = logging.getLogger("aquire.polly")

_POLLY_CLIENT = None


def _get_polly():
    global _POLLY_CLIENT
    if _POLLY_CLIENT is None:
        _POLLY_CLIENT = boto3.client(
            "polly",
            region_name=os.environ.get("POLLY_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _POLLY_CLIENT


VOICE_MAP = {
    "hinglish": "Kajal",
    "hindi":    "Aditi",
    "english":  "Joanna",
}

def synthesize_speech(text: str, voice_id: str = "Kajal", language_code: str = "hi-IN") -> bytes:
    """
    Amazon Polly (Neural) — converts Kiro's Hinglish response to speech.
    Kajal is the Neural voice for Hindi/Hinglish, available in ap-south-1 and us-east-1.
    """
    try:
        polly = _get_polly()

        response = polly.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            LanguageCode=language_code,
            Engine="neural",
        )

        return response["AudioStream"].read()

    except Exception as e:
        logger.exception("synthesize_speech error")
        return b""
