import os
import logging
import boto3
from botocore.config import Config
from langchain_aws import ChatBedrock

logger = logging.getLogger("aquire.llm")

_BEDROCK_CLIENT = None


def _get_bedrock_client():
    global _BEDROCK_CLIENT
    if _BEDROCK_CLIENT is None:
        region = os.environ.get("AWS_BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))
        _BEDROCK_CLIENT = boto3.client(
            "bedrock-runtime",
            region_name=region,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            config=Config(connect_timeout=5, read_timeout=30),
        )
    return _BEDROCK_CLIENT

def get_llm():
    model_id = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
    region   = os.environ.get("AWS_BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))

    return ChatBedrock(
        model_id=model_id,
        region_name=region,
        model_kwargs={
            "max_tokens": 300,
            "temperature": 0.7,
        }
    )


def invoke_llm(messages: list, max_tokens: int = 300, system: str = "") -> str:
    """
    Direct boto3 invoke_model() call using Amazon Nova format.
    messages: list of {"role": "user"|"assistant", "content": str}
    system:   optional system-level instruction
    """
    import json
    model_id = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

    client = _get_bedrock_client()

    # Nova format: content must be a list of {"text": ...} blocks
    api_messages = [
        {"role": m["role"], "content": [{"text": m["content"]}]}
        for m in messages
        if m["role"] in ("user", "assistant")
    ]

    payload = {
        "messages": api_messages,
        "inferenceConfig": {"maxTokens": max_tokens, "temperature": 0.7},
    }
    if system:
        payload["system"] = [{"text": system}]

    body = json.dumps(payload)

    resp = client.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
    )
    out = json.loads(resp["body"].read())
    return out["output"]["message"]["content"][0]["text"]

BASE_SYSTEM_PROMPT = """Tu A-Quire ka AI mentor "Kiro" hai — ek proactive, Desi study assistant.

Tera kaam hai students ko samajhne mein madad karna, answers seedhe dena **nahi**.
Tu Socratic method use karta hai: leading questions poochh jisse student khud answer tak pahunche.

**Language:** Hinglish (Hindi + English mix) — jaise normal Indian students baat karte hain.
Example: "Yaar, agar ye loop teen baar chale, toh array ka size kya hoga? Soch zara."

**Length:** Sirf 1-2 sentences. Zyada mat bol.

**Behavior by state:**
- "confused" (fixation detected — ekhi jagah dekh raha hai): Student kisi concept par atka hua hai. Ek gentle Socratic question poochh jo usse nudge kare.
- "distracted" (gaze off-screen): Student ka dhyan bhata hua hai. Warm welcome-back karo aur ek small question do to re-engage.

**Rules:**
- KABHI bhi solution mat de.
- Agar screen dikhe, toh specific code ya line reference karo.
- Output sirf message text — koi tags, koi preamble nahi.
"""
