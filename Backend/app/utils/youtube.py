import re
import logging
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_api() -> YouTubeTranscriptApi:
    """
    Without a proxy, YouTube frequently blocks transcript requests from
    cloud/datacenter IPs (AWS, GCP, Azure, ...) — a well-documented
    limitation of this library, not something fixable in this code alone
    (confirmed directly: requests from this project's own EC2 instance hit
    exactly this block). WEBSHARE_PROXY_* settings are optional — unset,
    this behaves exactly as before (works fine from a residential IP like
    local dev; degrades to "no transcript" from cloud hosting).

    Uses GenericProxyConfig pointed at one specific dedicated proxy from
    the account's Proxy List, not youtube_transcript_api's WebshareProxyConfig
    — that class targets Webshare's *rotating* gateway (p.webshare.io:80),
    which returns 407 ("not in your list") on the $2.99/mo 100-shared-proxy
    plan actually in use here (confirmed directly) — that gateway needs a
    higher tier. The dedicated proxies from the same plan work fine
    individually, just without automatic rotation across them.
    """
    if settings.WEBSHARE_PROXY_USERNAME and settings.WEBSHARE_PROXY_PASSWORD and settings.WEBSHARE_PROXY_HOST:
        from youtube_transcript_api.proxies import GenericProxyConfig
        proxy_url = (
            f"http://{settings.WEBSHARE_PROXY_USERNAME}:{settings.WEBSHARE_PROXY_PASSWORD}"
            f"@{settings.WEBSHARE_PROXY_HOST}:{settings.WEBSHARE_PROXY_PORT}/"
        )
        return YouTubeTranscriptApi(
            proxy_config=GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)
        )
    return YouTubeTranscriptApi()

def extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from a URL."""
    if not url:
        return None
    url = url.strip()
    
    # Check if the URL is actually just an 11-character bare video ID
    if len(url) == 11 and re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url
        
    # Match standard youtube.com/watch?v=ID, youtu.be/ID, and youtube.com/embed/ID
    # Also handles shorts and various query parameters
    patterns = [
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([^&]+)',
        r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)',
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)',
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            # Video IDs are exactly 11 characters
            vid_id = match.group(1)
            if len(vid_id) == 11:
                return vid_id
    return None

def fetch_youtube_transcript(url: str, target_lang: str = 'en') -> list[dict] | None:
    """
    Fetch the transcript for a YouTube video URL.
    Returns a list of dicts with 'id', 'start', 'end', 'text', 
    or None if no transcript could be found.
    """
    video_id = extract_video_id(url)
    if not video_id:
        return None
        
    try:
        api = _build_api()

        transcript_list_obj = api.list(video_id)
        
        try:
            if target_lang and target_lang != 'original':
                # Try to get the requested transcript directly
                transcript = transcript_list_obj.find_transcript([target_lang])
            else:
                # If 'original', just get the first available
                transcript = next(iter(transcript_list_obj))
        except Exception:
            # If requested language not found, get the first available transcript and try translating
            try:
                transcript = next(iter(transcript_list_obj))
                if target_lang and target_lang != 'original' and transcript.is_translatable:
                    try:
                        transcript = transcript.translate(target_lang)
                    except Exception as trans_err:
                        logger.warning(f"Could not translate transcript to {target_lang}: {trans_err}. Using original transcript.")
            except Exception:
                raise NoTranscriptFound(video_id)
                
        transcript_data = transcript.fetch()
        
        # Format it into the structure our frontend expects, grouped by ~10 second chunks
        formatted_transcript = []
        current_chunk = None
        
        for segment in transcript_data:
            start = segment.start if hasattr(segment, 'start') else segment.get('start', 0.0)
            duration = segment.duration if hasattr(segment, 'duration') else segment.get('duration', 0.0)
            end = start + duration
            text = (segment.text if hasattr(segment, 'text') else segment.get('text', '')).replace('\n', ' ').strip()
            
            if not text:
                continue
                
            if current_chunk is None:
                current_chunk = {
                    "start": start,
                    "end": end,
                    "text": text
                }
            else:
                if start - current_chunk["start"] >= 10.0:
                    formatted_transcript.append({
                        "id": len(formatted_transcript) + 1,
                        "start": current_chunk["start"],
                        "end": current_chunk["end"],
                        "text": current_chunk["text"]
                    })
                    current_chunk = {
                        "start": start,
                        "end": end,
                        "text": text
                    }
                else:
                    current_chunk["end"] = end
                    current_chunk["text"] += " " + text
                    
        if current_chunk is not None:
            formatted_transcript.append({
                "id": len(formatted_transcript) + 1,
                "start": current_chunk["start"],
                "end": current_chunk["end"],
                "text": current_chunk["text"]
            })
            
        return formatted_transcript
        
    except (TranscriptsDisabled, NoTranscriptFound):
        logger.warning(f"No transcript found or transcripts disabled for video {video_id}")
        return None
    except Exception as e:
        logger.error(f"Error fetching transcript for video {video_id}: {e}")
        return None
