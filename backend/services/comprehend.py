"""
services/comprehend.py — NLP analysis of student code/text using Amazon Comprehend.

Detects:
  - Dominant language (to confirm Hinglish/English)
  - Key phrases that suggest confusion (e.g. "I don't know", "kya hoga", "unclear")
  - Sentiment (NEGATIVE sentiment in code comments = frustration/confusion)
"""
import boto3
import logging
import os

logger = logging.getLogger("aquire.comprehend")

_COMP_CLIENT = None


def _get_client():
    global _COMP_CLIENT
    if _COMP_CLIENT is None:
        _COMP_CLIENT = boto3.client(
            "comprehend",
            region_name=os.environ.get("COMPREHEND_REGION", os.environ.get("AWS_REGION", "us-east-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _COMP_CLIENT


CONFUSION_KEYWORDS = {
    "don't know", "idk", "confused", "stuck", "error", "why", "help",
    "samajh nahi", "kya hoga", "kyun", "problem", "issue", "fail",
    "wrong", "incorrect", "bug", "not working", "pata nahi",
}


def analyze_code_confusion(text: str) -> dict:
    """
    Analyzes the student's code (comments + variable names) for confusion signals.

    Returns:
    {
        "confusion_score": 0.65,        # 0-1
        "sentiment": "NEGATIVE",
        "key_phrases": ["don't know", "why is this wrong"],
        "confusion_keywords_found": ["don't know", "wrong"],
    }
    """
    if not text or len(text.strip()) < 10:
        return {"confusion_score": 0.0, "sentiment": "NEUTRAL", "key_phrases": []}

    # Only analyze comments and string literals — first 4000 chars (Comprehend limit)
    snippet = text[:4000]

    try:
        comp = _get_client()

        sentiment_resp = comp.detect_sentiment(Text=snippet, LanguageCode="en")
        sentiment = sentiment_resp.get("Sentiment", "NEUTRAL")
        sentiment_scores = sentiment_resp.get("SentimentScore", {})

        phrases_resp = comp.detect_key_phrases(Text=snippet, LanguageCode="en")
        key_phrases = [
            p["Text"].lower()
            for p in phrases_resp.get("KeyPhrases", [])
            if p.get("Score", 0) > 0.7
        ]

        matched = [kw for kw in CONFUSION_KEYWORDS if kw in snippet.lower()]
        keyword_score = min(len(matched) * 0.2, 0.6)
        neg_score = sentiment_scores.get("Negative", 0.0) * 0.4
        confusion_score = round(min(keyword_score + neg_score, 1.0), 3)

        return {
            "confusion_score": confusion_score,
            "sentiment": sentiment,
            "key_phrases": key_phrases[:5],
            "confusion_keywords_found": matched,
        }

    except Exception as e:
        err = str(e).lower()
        if "subscription" in err or "access" in err:
            # Comprehend not subscribed — fall back to local keyword matching only
            matched = [kw for kw in CONFUSION_KEYWORDS if kw in snippet.lower()]
            confusion_score = round(min(len(matched) * 0.2, 0.6), 3)
            return {
                "confusion_score": confusion_score,
                "sentiment": "NEUTRAL",
                "key_phrases": [],
                "confusion_keywords_found": matched,
                "source": "local_fallback",
            }
        logger.warning("analyze_code_confusion error: %s", e)
        return {"confusion_score": 0.0, "sentiment": "NEUTRAL", "key_phrases": []}

