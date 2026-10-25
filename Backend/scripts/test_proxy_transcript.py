"""
scripts/test_proxy_transcript.py
Test fetching YouTube transcript with current configuration (and proxy if configured).
Usage: python scripts/test_proxy_transcript.py [youtube_url]
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.utils.youtube import fetch_youtube_transcript, extract_video_id

def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "https://youtu.be/FchQ6wZVqsA"
    vid_id = extract_video_id(url)
    print(f"[*] Testing transcript fetch for: {url} (Video ID: {vid_id})")
    
    if settings.WEBSHARE_PROXY_HOST and settings.WEBSHARE_PROXY_USERNAME:
        print(f"[*] Webshare Proxy Configured: {settings.WEBSHARE_PROXY_HOST}:{settings.WEBSHARE_PROXY_PORT} (User: {settings.WEBSHARE_PROXY_USERNAME})")
    else:
        print("[!] No proxy configured in settings - attempting direct connection (may be blocked on AWS)")

    transcript = fetch_youtube_transcript(url)
    if transcript:
        print(f"[SUCCESS] Successfully fetched {len(transcript)} transcript chunks!")
        print(f"First chunk: {transcript[0]}")
        print(f"Last chunk: {transcript[-1]}")
    else:
        print("[FAILURE] Could not fetch transcript. If running on AWS/EC2, ensure WEBSHARE_PROXY_* are set in .env")

if __name__ == "__main__":
    main()
