from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API keys
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── MODELS ───

class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = None

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "general"

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    progress: Optional[int] = None

class CheckinCreate(BaseModel):
    working_on: str
    energy_level: int = Field(ge=1, le=10)
    mood: Optional[str] = "neutral"

class AvatarConfig(BaseModel):
    face_preset: Optional[str] = "default"
    skin_tone: Optional[str] = "medium"
    hairstyle: Optional[str] = "short"
    outfit: Optional[str] = "hoodie"
    strict_level: Optional[int] = 5
    humor_level: Optional[int] = 5
    verbosity_level: Optional[int] = 5
    voice_type: Optional[str] = "calm"

# ─── AUTH HELPERS ───

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ─── AUTH ENDPOINTS ───

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": data["email"]}, {"$set": {"name": data["name"], "picture": data["picture"]}})
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data["picture"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.avatar_configs.insert_one({
            "user_id": user_id,
            "face_preset": "default",
            "skin_tone": "medium",
            "hairstyle": "short",
            "outfit": "hoodie",
            "strict_level": 5,
            "humor_level": 5,
            "verbosity_level": 5,
            "voice_type": "calm",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = data.get("session_token", f"st_{uuid.uuid4().hex}")
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*3600
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ─── CHAT ENDPOINT ───

def detect_mode(message: str) -> str:
    msg = message.lower()
    edu_kw = ["study", "learn", "explain", "concept", "teach", "homework", "exam", "math", "science", "history", "physics", "chemistry", "biology", "code", "programming"]
    coach_kw = ["discipline", "routine", "habit", "schedule", "productive", "consistency", "workout", "gym", "exercise", "run", "push", "challenge", "goal"]
    well_kw = ["sleep", "food", "eat", "diet", "health", "nutrition", "water", "rest", "tired", "energy"]
    listen_kw = ["feel", "sad", "anxious", "stress", "worried", "lonely", "depressed", "angry", "hurt", "scared", "overwhelm"]
    for kw in listen_kw:
        if kw in msg:
            return "listener"
    for kw in edu_kw:
        if kw in msg:
            return "educator"
    for kw in coach_kw:
        if kw in msg:
            return "coach"
    for kw in well_kw:
        if kw in msg:
            return "wellness"
    return "general"

def build_system_prompt(avatar_config: dict, memory_context: str, mode: str) -> str:
    strict = avatar_config.get("strict_level", 5)
    humor = avatar_config.get("humor_level", 5)
    verbosity = avatar_config.get("verbosity_level", 5)
    mode_instructions = {
        "educator": "You are in EDUCATOR mode. Break down concepts clearly. Teach thinking, not just answers. Use examples and analogies.",
        "coach": "You are in PERFORMANCE COACH mode. Build discipline. Create actionable routines. Push consistency. Be firm but encouraging.",
        "wellness": "You are in WELLNESS GUIDE mode. Give practical advice on food, sleep, and habits. Be caring but straightforward.",
        "listener": "You are in LISTENER mode. Provide emotional support. Be empathetic and reflective. Ask thoughtful questions. Don't rush to solutions.",
        "general": "Auto-detect what the user needs and respond accordingly. You can switch between educator, coach, wellness guide, or listener."
    }
    return f"""You are Bhaiya - a high-performing, supportive older brother and AI mentor for teens and young adults.

CORE IDENTITY:
- Direct but supportive
- Intelligent but not arrogant
- Motivating but not cringe
- Calm, confident, slightly witty
- Never robotic. Never generic. Talk like a real person.

CURRENT MODE: {mode_instructions.get(mode, mode_instructions["general"])}

PERSONALITY:
- Strictness: {strict}/10 (1=very chill, 10=very strict)
- Humor: {humor}/10 (1=serious, 10=very funny)
- Verbosity: {verbosity}/10 (1=concise, 10=talkative)

{f"MEMORY CONTEXT (reference naturally when relevant):{chr(10)}{memory_context}" if memory_context else ""}

RULES:
- Talk like a real older brother, not a bot
- Reference past conversations and goals when relevant
- No medical diagnoses
- No harmful advice
- If someone shares serious mental health concerns, suggest professional help alongside your support
- Keep responses focused and actionable
- Use the user's name occasionally
- If strict level is high, be more demanding and push harder
- If humor level is high, add wit and banter"""

@api_router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    user_name = user.get("name", "bro")
    mode = req.mode or detect_mode(req.message)
    avatar = await db.avatar_configs.find_one({"user_id": user_id}, {"_id": 0})
    if not avatar:
        avatar = {"strict_level": 5, "humor_level": 5, "verbosity_level": 5}
    recent_msgs = await db.chat_messages.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(15).to_list(15)
    recent_msgs.reverse()
    goals = await db.goals.find({"user_id": user_id, "completed": False}, {"_id": 0}).to_list(10)
    checkins = await db.checkins.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(3).to_list(3)
    memory_parts = []
    if goals:
        memory_parts.append("Active Goals: " + ", ".join([g["title"] for g in goals]))
    if checkins:
        latest = checkins[0]
        memory_parts.append(f"Latest Check-in: Working on '{latest.get('working_on', 'unknown')}', Energy: {latest.get('energy_level', '?')}/10")
    memory_parts.append(f"User's name: {user_name}")
    memory_context = "\n".join(memory_parts)
    system_prompt = build_system_prompt(avatar, memory_context, mode)
    session_id = f"bhaiya_{user_id}_{uuid.uuid4().hex[:8]}"
    # Build message history for context
    history = [{"role": "system", "content": system_prompt}]
    for msg in recent_msgs:
        if msg.get("role") in ("user", "assistant"):
            history.append({"role": msg["role"], "content": msg["content"]})
    chat = LlmChat(
        api_key=ANTHROPIC_API_KEY,
        session_id=session_id,
        system_message=system_prompt,
        initial_messages=history
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    user_message = UserMessage(text=req.message)
    try:
        response_text = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=500, detail="AI service error")
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "role": "user",
        "content": req.message,
        "mode": mode,
        "created_at": now
    })
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "role": "assistant",
        "content": response_text,
        "mode": mode,
        "created_at": now
    })
    return {"response": response_text, "mode": mode}

@api_router.get("/chat/history")
async def get_chat_history(request: Request, limit: int = 50):
    user = await get_current_user(request)
    messages = await db.chat_messages.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return messages

@api_router.delete("/chat/history")
async def clear_chat_history(request: Request):
    user = await get_current_user(request)
    await db.chat_messages.delete_many({"user_id": user["user_id"]})
    return {"message": "Chat history cleared"}

# ─── AVATAR ENDPOINTS ───

@api_router.get("/avatar")
async def get_avatar(request: Request):
    user = await get_current_user(request)
    config = await db.avatar_configs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not config:
        config = AvatarConfig().model_dump()
        config["user_id"] = user["user_id"]
        config["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.avatar_configs.insert_one(config)
        config.pop("_id", None)
    return config

@api_router.put("/avatar")
async def update_avatar(config: AvatarConfig, request: Request):
    user = await get_current_user(request)
    update_data = config.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.avatar_configs.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data},
        upsert=True
    )
    result = await db.avatar_configs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return result

# ─── GOALS ENDPOINTS ───

@api_router.post("/goals")
async def create_goal(goal: GoalCreate, request: Request):
    user = await get_current_user(request)
    goal_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "title": goal.title,
        "description": goal.description,
        "category": goal.category,
        "completed": False,
        "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.goals.insert_one(goal_doc)
    goal_doc.pop("_id", None)
    return goal_doc

@api_router.get("/goals")
async def get_goals(request: Request):
    user = await get_current_user(request)
    goals = await db.goals.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return goals

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, update: GoalUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.goals.update_one(
        {"id": goal_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    goal = await db.goals.find_one({"id": goal_id, "user_id": user["user_id"]}, {"_id": 0})
    return goal

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    await db.goals.delete_one({"id": goal_id, "user_id": user["user_id"]})
    return {"message": "Goal deleted"}

# ─── CHECKIN ENDPOINTS ───

@api_router.post("/checkin")
async def create_checkin(checkin: CheckinCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "working_on": checkin.working_on,
        "energy_level": checkin.energy_level,
        "mood": checkin.mood,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.checkins.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/checkin/latest")
async def get_latest_checkin(request: Request):
    user = await get_current_user(request)
    checkin = await db.checkins.find_one(
        {"user_id": user["user_id"]}, {"_id": 0},
        sort=[("created_at", -1)]
    )
    return checkin or {}

@api_router.get("/checkin/history")
async def get_checkin_history(request: Request, limit: int = 30):
    user = await get_current_user(request)
    checkins = await db.checkins.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return checkins

# ─── STATS ───

@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    total_msgs = await db.chat_messages.count_documents({"user_id": uid, "role": "user"})
    total_goals = await db.goals.count_documents({"user_id": uid})
    completed_goals = await db.goals.count_documents({"user_id": uid, "completed": True})
    total_checkins = await db.checkins.count_documents({"user_id": uid})
    return {
        "total_messages": total_msgs,
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "total_checkins": total_checkins,
        "streak": min(total_checkins, 7)
    }

# ─── ROOT ───

@api_router.get("/")
async def root():
    return {"message": "Bhaiya AI API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
