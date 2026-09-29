"""
app/core/logger.py
──────────────────
Structured JSON logger configuration.
"""
from __future__ import annotations

import logging
import sys
import json
from datetime import datetime

from app.core.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        
        # Add extra fields if they exist
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_record["user_id"] = record.user_id
        if hasattr(record, "endpoint"):
            log_record["endpoint"] = record.endpoint
        
        # Add stack trace if there is an exception
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

def setup_logger() -> logging.Logger:
    logger = logging.getLogger(settings.APP_NAME)
    
    # Avoid duplicate logs if already configured
    if logger.hasHandlers():
        logger.handlers.clear()
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    logger.addHandler(handler)
    
    # Set log level based on config
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    
    return logger

log = setup_logger()
