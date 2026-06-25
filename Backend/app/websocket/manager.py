from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        """Connect a user websocket"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected")
    
    async def disconnect(self, user_id: int, websocket: WebSocket):
        """Disconnect a user websocket"""
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected")
    
    async def broadcast_to_user(self, user_id: int, message: dict):
        """Send message to all connections of a user"""
        if user_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
                logger.error(f"Failed to send message: {e}")
        
        # Clean up dead connections
        for connection in disconnected:
            await self.disconnect(user_id, connection)


# Global connection manager
manager = ConnectionManager()
