import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
import models
import auth as auth_utils
from routers import auth, tutors, availability, bookings, payments, reviews, admin, notifications, tracking, video, uploads, ai_assistant, rag
from websocket import manager


def ensure_admin_exists():
    """Auto-create the one predefined Admin account if it doesn't already exist."""
    db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.role == "Admin").first()
        if not admin_user:
            hashed_pw = auth_utils.get_password_hash("Admin@TutorNow2024!")
            admin_user = models.User(
                name="System Admin",
                email="admin@tutornow.com",
                mobile="9000000000",
                password=hashed_pw,
                role="Admin",
                is_suspended=False,
            )
            db.add(admin_user)
            db.commit()
            print("[SUCCESS] Admin account created: admin@tutornow.com / Admin@TutorNow2024!")
        else:
            print(f"[OK] Admin account already exists: {admin_user.email}")
    finally:
        db.close()



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    try:
        from supabase_sync import register_supabase_listeners, pull_initial_data_from_supabase
        register_supabase_listeners()
        pull_initial_data_from_supabase()
    except Exception as e:
        print(f"[WARN] Supabase sync setup error: {e}")
    ensure_admin_exists()
    try:
        from seed import seed_if_empty
        seed_if_empty()
    except Exception as e:
        print(f"[WARN] Auto-seed status: {e}")
    yield
    # Shutdown (nothing to clean up)



app = FastAPI(
    title="TutorNow API",
    description="Real-Time On-Demand Tutor Booking Platform Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Create database tables automatically (also called in lifespan)
Base.metadata.create_all(bind=engine)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print("[ERROR] GLOBAL EXCEPTION OCCURRED:")
    traceback.print_exc()

    err_str = str(exc)
    if "OperationalError" in type(exc).__name__ or "could not translate host name" in err_str or "psycopg2" in err_str or "sqlalchemy" in err_str.lower():
        return JSONResponse(
            status_code=500,
            content={"detail": "Database connection temporarily interrupted. Please try logging in again."}
        )

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )


# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to TutorNow API. Access documentation at /docs"}

@app.get("/api/server-time")
def get_server_time():
    """Returns exact UTC server timestamp for client synchronization."""
    import datetime
    now = datetime.datetime.utcnow()
    return {
        "utc_timestamp": now.isoformat() + "Z",
        "epoch_ms": int(now.timestamp() * 1000)
    }

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
app.include_router(uploads.router)
app.include_router(ai_assistant.router)
app.include_router(rag.router)

# WebSocket Endpoint for Notifications
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
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

# WebSocket Endpoint for Real-time Native WebRTC Video Classroom & Whiteboard
@app.websocket("/ws/video/{booking_id}")
async def websocket_video_endpoint(websocket: WebSocket, booking_id: int):
    await manager.connect_video(booking_id, websocket)
    count = len(manager.video_connections.get(booking_id, []))
    try:
        # Send current room count to newly joined peer
        await websocket.send_json({"type": "room_state", "peer_count": count})
        # Notify other peers in room that a participant joined
        await manager.broadcast_video(booking_id, {"type": "peer_joined", "peer_count": count}, sender_socket=websocket)
        while True:
            data = await websocket.receive_json()
            # Broadcast WebRTC offer/answer/candidate/chat/whiteboard to the other party
            await manager.broadcast_video(booking_id, data, sender_socket=websocket)
    except WebSocketDisconnect:
        manager.disconnect_video(booking_id, websocket)
        remaining = len(manager.video_connections.get(booking_id, []))
        await manager.broadcast_video(booking_id, {"type": "peer_left", "peer_count": remaining}, sender_socket=websocket)
    except Exception:
        manager.disconnect_video(booking_id, websocket)
        remaining = len(manager.video_connections.get(booking_id, []))
        await manager.broadcast_video(booking_id, {"type": "peer_left", "peer_count": remaining}, sender_socket=websocket)

