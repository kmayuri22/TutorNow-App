from typing import Dict, List, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps user_id → list of active WebSockets (supports multiple tabs/devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps booking_id → set of WebSockets watching live tracking
        self.tracking_connections: Dict[int, List[WebSocket]] = {}

    # ─── User notification connections ───────────────────────────
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        """Push a JSON payload to all active connections of a specific user."""
        if user_id in self.active_connections:
            dead = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                self.active_connections[user_id].remove(d)

    async def broadcast(self, message: dict):
        """Broadcast JSON to all connected users."""
        for user_id, connections in list(self.active_connections.items()):
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    # ─── Live tracking connections (per booking) ─────────────────
    async def connect_tracking(self, booking_id: int, websocket: WebSocket):
        """Connect a client to a specific booking's live tracking stream."""
        await websocket.accept()
        if booking_id not in self.tracking_connections:
            self.tracking_connections[booking_id] = []
        self.tracking_connections[booking_id].append(websocket)

    def disconnect_tracking(self, booking_id: int, websocket: WebSocket):
        if booking_id in self.tracking_connections:
            if websocket in self.tracking_connections[booking_id]:
                self.tracking_connections[booking_id].remove(websocket)
            if not self.tracking_connections[booking_id]:
                del self.tracking_connections[booking_id]

    async def broadcast_tracking(self, booking_id: int, message: dict):
        """Broadcast a location update to all watchers of a booking."""
        if booking_id in self.tracking_connections:
            dead = []
            for connection in self.tracking_connections[booking_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                self.tracking_connections[booking_id].remove(d)

manager = ConnectionManager()
