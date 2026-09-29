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

def fetch_youtube_transcript(url: str) -> list[dict] | None:
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
            # Try to get English transcript directly
            transcript = transcript_list_obj.find_transcript(['en'])
        except Exception:
            # If not found, get the first available transcript
            try:
                transcript = next(iter(transcript_list_obj))
                if transcript.is_translatable:
                    transcript = transcript.translate('en')
            except Exception:
                raise NoTranscriptFound(video_id)
                
        transcript_data = transcript.fetch()
        
        # Format it into the structure our frontend expects
        formatted_transcript = []
        for i, segment in enumerate(transcript_data):
            formatted_transcript.append({
                "id": i + 1,
                "start": segment.start if hasattr(segment, 'start') else segment.get('start', 0.0),
                "end": (segment.start + segment.duration) if hasattr(segment, 'start') else (segment.get('start', 0.0) + segment.get('duration', 0.0)),
                "text": (segment.text if hasattr(segment, 'text') else segment.get('text', '')).replace('\n', ' ')
            })
            
        return formatted_transcript
        
    except (TranscriptsDisabled, NoTranscriptFound):
        logger.warning(f"No transcript found or transcripts disabled for video {video_id}")
        return None
    except Exception as e:
        logger.error(f"Error fetching transcript for video {video_id}: {e}")
        return None
