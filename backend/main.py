from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import auth, tutors, availability, bookings, payments, reviews, admin, notifications, tracking, video
from websocket import manager

# Create database tables automatically
# Note: In production with alembic, this is typically done via migrations,
# but calling create_all here ensures it runs immediately out-of-the-box for evaluation.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TutorNow API",
    description="Real-Time On-Demand Tutor Booking Platform Backend",
    version="1.0.0"
)

# CORS configuration
# Allows standard local frontend servers (port 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins for easy testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to TutorNow API. Access documentation at /docs"}

# Include Routers
app.include_router(auth.router)
app.include_router(tutors.router)
app.include_router(availability.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(tracking.router)
app.include_router(video.router)

# WebSocket Endpoint for Notifications
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection open. We can listen for messages if needed,
            # but in TutorNow we mostly push notifications from backend -> client.
            data = await websocket.receive_text()
            # Echo back keepalive message or echo
            await websocket.send_json({"type": "ping", "data": "alive"})
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)

# WebSocket Endpoint for Live Tracking
@app.websocket("/ws/tracking/{booking_id}")
async def websocket_tracking_endpoint(websocket: WebSocket, booking_id: int):
    await manager.connect_tracking(booking_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "ping", "data": "alive"})
    except WebSocketDisconnect:
        manager.disconnect_tracking(booking_id, websocket)
    except Exception:
        manager.disconnect_tracking(booking_id, websocket)
