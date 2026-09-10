"""
AURA AI — Real-time WebSocket Event Dispatcher
Streams live orchestration events, DAG execution milestones, and agent logs.
"""

from typing import List, Dict, Any, Set
import json
import asyncio
import logging

logger = logging.getLogger("aura_brain.ws")

class EventDispatcher:
    def __init__(self):
        self.active_connections: Set[Any] = set()

    async def connect(self, websocket: Any):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: Any):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        message = json.dumps({
            "type": event_type,
            "data": payload
        })
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)

event_dispatcher = EventDispatcher()
