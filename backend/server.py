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
from emergentintegrations.llm.openai import OpenAIChatRealtime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API keys
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# OpenAI Realtime Voice
realtime_chat = OpenAIChatRealtime(api_key=OPENAI_API_KEY)
realtime_router = APIRouter()
OpenAIChatRealtime.register_openai_realtime_router(realtime_router, realtime_chat)
app.include_router(realtime_router, prefix="/api/v1")

# Custom Bhaiya Voice Session endpoint (with personality)
import aiohttp
@api_router.post("/voice/session")
async def create_bhaiya_voice_session():
    bhaiya_instructions = """You are Anushka Didi — a warm, caring older sister and AI mentor for children ages 8-16. Many of these children are in orphanages or difficult situations. You talk like a real person on a phone call. You are warm, patient, encouraging, and fun. Never robotic. Keep responses short and sweet — you're on a call with a kid. Use simple language. Celebrate them. Ask about their day. Help with homework. Listen when they're sad. Be the older sister they always wished they had."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-realtime-preview-2024-12-17",
                "voice": "shimmer",
                "instructions": bhaiya_instructions,
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 800,
                },
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
            }
        ) as resp:
            data = await resp.json()
            return data

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── MODELS ───

class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = None
    voice: Optional[bool] = False

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
    language: Optional[str] = "English"

SUPPORTED_LANGUAGES = [
    "English", "Mandarin Chinese", "Hindi", "Spanish", "French",
    "Arabic", "Bengali", "Portuguese", "Russian", "Japanese",
    "German", "Korean", "Turkish", "Vietnamese", "Italian",
    "Thai", "Polish", "Dutch", "Indonesian", "Tamil",
    "Telugu", "Urdu", "Persian", "Swahili", "Ukrainian"
]

class FocusStart(BaseModel):
    duration_minutes: int = 25
    task: Optional[str] = ""

class FocusEnd(BaseModel):
    session_id: str
    completed: bool = True
    notes: Optional[str] = ""

class RoutineCreate(BaseModel):
    title: str
    steps: List[str] = []
    category: Optional[str] = "study"
    frequency: Optional[str] = "daily"

class RoutineUpdate(BaseModel):
    title: Optional[str] = None
    steps: Optional[List[str]] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    active: Optional[bool] = None

class ChallengeComplete(BaseModel):
    challenge_id: str

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
    language = avatar_config.get("language", "English")
    mode_instructions = {
        "educator": "You are in TEACHER mode. Explain things simply and clearly, like helping a younger sibling with homework. Use fun examples, stories, and analogies kids can relate to. Be patient.",
        "coach": "You are in CHEERLEADER mode. Help them build good habits and routines. Celebrate small wins. Be encouraging, never harsh.",
        "wellness": "You are in CARE mode. Talk about eating well, sleeping enough, staying active, and feeling good. Be warm and motherly.",
        "listener": "You are in LISTENER mode. This child needs someone to talk to. Be a safe space. Listen more than you talk. Validate their feelings. If they share something serious, gently suggest they talk to a trusted adult.",
        "general": "Auto-detect what the child needs — help with studies, emotional support, fun conversation, or guidance.",
        "future_you": "You are in DREAM MODE. Help the child imagine their amazing future. Paint a picture of what their life could look like. Be inspiring. Make them believe in themselves.",
        "real_talk": "You are in REAL TALK mode. Be honest but always kind. If they're making excuses, gently point it out. Never be mean — think caring older sister who tells the truth with love."
    }
    return f"""You are Anushka Didi — a warm, caring, and smart older sister (Didi) and AI mentor for children ages 8-16.

CORE IDENTITY:
- You are like a loving older sister who always has time for them
- Warm, patient, encouraging, and fun
- Smart but never makes them feel dumb
- Uses simple language appropriate for kids
- Celebrates every small win
- Makes learning feel like an adventure
- NEVER robotic or generic — talk like a real person who genuinely cares

TARGET: Children ages 8-16, many in orphanages or difficult situations. These children may lack family support, so you are extra important. Be the consistent, reliable, loving presence they need.

CURRENT MODE: {mode_instructions.get(mode, mode_instructions["general"])}

PERSONALITY:
- Warmth: {strict}/10 (1=very gentle, 10=more structured)
- Fun: {humor}/10 (1=calm, 10=very playful)
- Detail: {verbosity}/10 (1=brief, 10=detailed)

{f"MEMORY (reference naturally):{chr(10)}{memory_context}" if memory_context else ""}

RULES:
- Use simple words kids understand
- Be encouraging — these kids need to feel believed in
- Use their name often — it makes them feel seen
- NO medical diagnoses, NO harmful advice
- If a child shares abuse, self-harm, or serious distress, respond with empathy AND encourage them to talk to a trusted adult or counselor
- Keep responses age-appropriate
- Make learning fun with stories and relatable examples
- LANGUAGE: Respond in {language}.
- VOICE MODE: If voice call, keep to 2-3 short sentences. Talk like you're on a call with a younger sibling."""

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
    # For voice calls, enforce short responses
    if req.voice:
        system_prompt += "\n\nYOU ARE ON A LIVE PHONE CALL. NOT TEXT. PHONE CALL.\n- Say maximum 2 SHORT sentences. 30 words max.\n- NO formatting. NO asterisks. NO bold. NO lists. NO numbering.\n- Sound like a real phone call. Quick and natural.\n- One thought only. One question max."
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
    # Strip markdown for voice responses
    import re
    clean_text = response_text
    if req.voice:
        clean_text = re.sub(r'\*\*(.+?)\*\*', r'\1', clean_text)  # bold
        clean_text = re.sub(r'\*(.+?)\*', r'\1', clean_text)  # italic
        clean_text = re.sub(r'#{1,6}\s*', '', clean_text)  # headers
        clean_text = re.sub(r'^\s*[-*]\s+', '', clean_text, flags=re.MULTILINE)  # bullets
        clean_text = re.sub(r'^\s*\d+\.\s+', '', clean_text, flags=re.MULTILINE)  # numbered
        clean_text = re.sub(r'\n{2,}', ' ', clean_text).strip()  # collapse newlines
        # Truncate to ~3 sentences if still too long
        sentences = re.split(r'(?<=[.!?])\s+', clean_text)
        if len(sentences) > 3:
            clean_text = ' '.join(sentences[:3])
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
    return {"response": clean_text, "mode": mode}

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
    total_focus = await db.focus_sessions.count_documents({"user_id": uid, "completed": True})
    total_challenges = await db.challenge_completions.count_documents({"user_id": uid})
    focus_minutes = 0
    sessions = await db.focus_sessions.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(100)
    for s in sessions:
        focus_minutes += s.get("duration_minutes", 0)
    # Calculate real streak from check-ins
    streak = 0
    checkins = await db.checkins.find({"user_id": uid}, {"_id": 0, "created_at": 1}).sort("created_at", -1).to_list(60)
    if checkins:
        today = datetime.now(timezone.utc).date()
        for i, c in enumerate(checkins):
            ca = c.get("created_at", "")
            if isinstance(ca, str):
                try:
                    d = datetime.fromisoformat(ca).date()
                except Exception:
                    break
            else:
                d = ca.date() if hasattr(ca, 'date') else today
            expected = today - timedelta(days=i)
            if d == expected:
                streak += 1
            else:
                break
    return {
        "total_messages": total_msgs,
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "total_checkins": total_checkins,
        "streak": streak,
        "total_focus_sessions": total_focus,
        "total_focus_minutes": focus_minutes,
        "total_challenges_completed": total_challenges,
    }

# ─── FOCUS MODE ───

FOCUS_TIPS = [
    "Block all distractions. Your phone can wait.",
    "One task at a time. Multitasking is a myth.",
    "Take deep breaths. Focus follows calm.",
    "Remember why you started this session.",
    "You're building momentum. Don't break the chain.",
    "Small consistent effort beats occasional heroics.",
    "Your future self will thank you for this.",
    "Stay in the zone. The flow state is earned.",
]

@api_router.post("/focus/start")
async def start_focus(req: FocusStart, request: Request):
    user = await get_current_user(request)
    import random
    session_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "duration_minutes": req.duration_minutes,
        "task": req.task,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "completed": False,
        "notes": "",
        "tip": random.choice(FOCUS_TIPS),
    }
    await db.focus_sessions.insert_one(session_doc)
    session_doc.pop("_id", None)
    return session_doc

@api_router.post("/focus/end")
async def end_focus(req: FocusEnd, request: Request):
    user = await get_current_user(request)
    await db.focus_sessions.update_one(
        {"id": req.session_id, "user_id": user["user_id"]},
        {"$set": {
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "completed": req.completed,
            "notes": req.notes,
        }}
    )
    session = await db.focus_sessions.find_one({"id": req.session_id}, {"_id": 0})
    return session or {}

@api_router.get("/focus/sessions")
async def get_focus_sessions(request: Request, limit: int = 20):
    user = await get_current_user(request)
    sessions = await db.focus_sessions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    return sessions

# ─── CHALLENGE MODE ───

CHALLENGES_POOL = [
    {"title": "Read for 20 minutes", "category": "study", "difficulty": "easy", "xp": 10},
    {"title": "Do 20 push-ups", "category": "fitness", "difficulty": "easy", "xp": 10},
    {"title": "Drink 8 glasses of water", "category": "wellness", "difficulty": "easy", "xp": 10},
    {"title": "Write down 3 things you're grateful for", "category": "mindset", "difficulty": "easy", "xp": 10},
    {"title": "No social media for 2 hours", "category": "discipline", "difficulty": "medium", "xp": 20},
    {"title": "Study a topic for 45 minutes straight", "category": "study", "difficulty": "medium", "xp": 25},
    {"title": "Go for a 30-min walk or run", "category": "fitness", "difficulty": "medium", "xp": 20},
    {"title": "Cook a healthy meal from scratch", "category": "wellness", "difficulty": "medium", "xp": 20},
    {"title": "Complete a full Pomodoro cycle (4x25 min)", "category": "discipline", "difficulty": "hard", "xp": 40},
    {"title": "Wake up at 6 AM", "category": "discipline", "difficulty": "hard", "xp": 30},
    {"title": "Teach someone something you learned today", "category": "study", "difficulty": "medium", "xp": 25},
    {"title": "Journal for 15 minutes about your goals", "category": "mindset", "difficulty": "easy", "xp": 15},
    {"title": "Do a 10-minute meditation", "category": "wellness", "difficulty": "easy", "xp": 15},
    {"title": "No junk food today", "category": "wellness", "difficulty": "medium", "xp": 20},
    {"title": "Reach out to someone you care about", "category": "social", "difficulty": "easy", "xp": 10},
    {"title": "Plan your next day before sleeping", "category": "discipline", "difficulty": "easy", "xp": 10},
    {"title": "Learn 10 new vocabulary words", "category": "study", "difficulty": "medium", "xp": 20},
    {"title": "Do a 1-minute cold shower", "category": "discipline", "difficulty": "hard", "xp": 35},
    {"title": "Stretch for 15 minutes", "category": "fitness", "difficulty": "easy", "xp": 10},
    {"title": "Organize your workspace", "category": "discipline", "difficulty": "easy", "xp": 10},
]

@api_router.get("/challenges/today")
async def get_today_challenges(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.daily_challenges.find({"user_id": uid, "date": today}, {"_id": 0}).to_list(3)
    if existing:
        return existing
    import random
    selected = random.sample(CHALLENGES_POOL, min(3, len(CHALLENGES_POOL)))
    challenges = []
    for ch in selected:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "date": today,
            "title": ch["title"],
            "category": ch["category"],
            "difficulty": ch["difficulty"],
            "xp": ch["xp"],
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.daily_challenges.insert_one(doc)
        doc.pop("_id", None)
        challenges.append(doc)
    return challenges

@api_router.post("/challenges/complete")
async def complete_challenge(req: ChallengeComplete, request: Request):
    user = await get_current_user(request)
    challenge = await db.daily_challenges.find_one(
        {"id": req.challenge_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    await db.daily_challenges.update_one(
        {"id": req.challenge_id},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.challenge_completions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "challenge_id": req.challenge_id,
        "title": challenge["title"],
        "xp": challenge.get("xp", 10),
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })
    updated = await db.daily_challenges.find_one({"id": req.challenge_id}, {"_id": 0})
    return updated

@api_router.get("/challenges/streak")
async def get_challenge_streak(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    completions = await db.challenge_completions.find({"user_id": uid}, {"_id": 0}).sort("completed_at", -1).to_list(200)
    total_xp = sum(c.get("xp", 0) for c in completions)
    # Calculate streak days
    streak = 0
    if completions:
        dates_set = set()
        for c in completions:
            try:
                d = datetime.fromisoformat(c["completed_at"]).date()
                dates_set.add(d)
            except Exception:
                pass
        today = datetime.now(timezone.utc).date()
        for i in range(365):
            if (today - timedelta(days=i)) in dates_set:
                streak += 1
            else:
                break
    return {"streak": streak, "total_xp": total_xp, "total_completed": len(completions)}

# ─── ROUTINES / STUDY PLANS ───

@api_router.post("/routines")
async def create_routine(routine: RoutineCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "title": routine.title,
        "steps": routine.steps,
        "category": routine.category,
        "frequency": routine.frequency,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.routines.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/routines")
async def get_routines(request: Request):
    user = await get_current_user(request)
    routines = await db.routines.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return routines

@api_router.put("/routines/{routine_id}")
async def update_routine(routine_id: str, update: RoutineUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.routines.update_one(
        {"id": routine_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    routine = await db.routines.find_one({"id": routine_id}, {"_id": 0})
    return routine

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, request: Request):
    user = await get_current_user(request)
    await db.routines.delete_one({"id": routine_id, "user_id": user["user_id"]})
    return {"message": "Routine deleted"}

@api_router.post("/routines/{routine_id}/log")
async def log_routine_completion(routine_id: str, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "routine_id": routine_id,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.routine_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/routines/{routine_id}/logs")
async def get_routine_logs(routine_id: str, request: Request, limit: int = 30):
    user = await get_current_user(request)
    logs = await db.routine_logs.find(
        {"user_id": user["user_id"], "routine_id": routine_id}, {"_id": 0}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    return logs

# ─── WEEKLY SUMMARY ───

@api_router.get("/summary/weekly")
async def get_weekly_summary(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    user_name = user.get("name", "there")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    checkins = await db.checkins.find(
        {"user_id": uid, "created_at": {"$gte": week_ago}}, {"_id": 0}
    ).to_list(30)
    msgs = await db.chat_messages.count_documents(
        {"user_id": uid, "role": "user", "created_at": {"$gte": week_ago}}
    )
    goals_completed = await db.goals.count_documents({"user_id": uid, "completed": True})
    goals_total = await db.goals.count_documents({"user_id": uid})
    focus_sessions = await db.focus_sessions.find(
        {"user_id": uid, "completed": True, "started_at": {"$gte": week_ago}}, {"_id": 0}
    ).to_list(50)
    focus_mins = sum(s.get("duration_minutes", 0) for s in focus_sessions)
    challenges_done = await db.challenge_completions.count_documents(
        {"user_id": uid, "completed_at": {"$gte": week_ago}}
    )
    avg_energy = 0
    if checkins:
        avg_energy = round(sum(c.get("energy_level", 5) for c in checkins) / len(checkins), 1)
    moods = [c.get("mood", "neutral") for c in checkins]
    mood_counts = {}
    for m in moods:
        mood_counts[m] = mood_counts.get(m, 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    summary_data = {
        "period": f"{(datetime.now(timezone.utc) - timedelta(days=7)).strftime('%b %d')} - {datetime.now(timezone.utc).strftime('%b %d, %Y')}",
        "checkins_count": len(checkins),
        "messages_sent": msgs,
        "goals_completed": goals_completed,
        "goals_total": goals_total,
        "focus_sessions": len(focus_sessions),
        "focus_minutes": focus_mins,
        "challenges_completed": challenges_done,
        "avg_energy": avg_energy,
        "top_mood": top_mood,
        "mood_breakdown": mood_counts,
    }
    # Generate AI summary
    prompt = f"""Generate a brief, encouraging weekly summary for {user_name}. Their stats this week:
- {len(checkins)} check-ins, avg energy {avg_energy}/10, top mood: {top_mood}
- {msgs} messages with Bhaiya
- {goals_completed}/{goals_total} goals completed
- {len(focus_sessions)} focus sessions ({focus_mins} minutes total)
- {challenges_done} challenges completed

Be specific, reference the data, and give 2-3 actionable suggestions for next week. Keep it under 150 words. Be real, not generic."""
    try:
        chat = LlmChat(
            api_key=ANTHROPIC_API_KEY,
            session_id=f"summary_{uid}_{uuid.uuid4().hex[:6]}",
            system_message="You are Anushka Didi, a warm caring AI mentor. Generate a weekly progress summary for a child."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        ai_summary = await chat.send_message(UserMessage(text=prompt))
        summary_data["ai_summary"] = ai_summary
    except Exception as e:
        logger.error(f"Summary AI error: {e}")
        summary_data["ai_summary"] = f"Great week, {user_name}! You sent {msgs} messages, completed {goals_completed} goals, and did {focus_mins} minutes of focused work. Keep building consistency!"
    return summary_data

# ─── PROGRESS CARD ───

@api_router.get("/progress-card")
async def get_progress_card(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    total_msgs = await db.chat_messages.count_documents({"user_id": uid, "role": "user"})
    total_goals = await db.goals.count_documents({"user_id": uid})
    completed_goals = await db.goals.count_documents({"user_id": uid, "completed": True})
    total_checkins = await db.checkins.count_documents({"user_id": uid})
    total_focus = await db.focus_sessions.count_documents({"user_id": uid, "completed": True})
    focus_mins = 0
    sessions = await db.focus_sessions.find({"user_id": uid, "completed": True}, {"_id": 0, "duration_minutes": 1}).to_list(500)
    for s in sessions:
        focus_mins += s.get("duration_minutes", 0)
    total_xp_docs = await db.challenge_completions.find({"user_id": uid}, {"_id": 0, "xp": 1}).to_list(500)
    total_xp = sum(d.get("xp", 0) for d in total_xp_docs)
    # Streak
    streak = 0
    checkins = await db.checkins.find({"user_id": uid}, {"_id": 0, "created_at": 1}).sort("created_at", -1).to_list(60)
    if checkins:
        today = datetime.now(timezone.utc).date()
        for i, c in enumerate(checkins):
            ca = c.get("created_at", "")
            if isinstance(ca, str):
                try:
                    d = datetime.fromisoformat(ca).date()
                except Exception:
                    break
            else:
                d = ca.date() if hasattr(ca, 'date') else today
            expected = today - timedelta(days=i)
            if d == expected:
                streak += 1
            else:
                break
    member_since = user.get("created_at", datetime.now(timezone.utc).isoformat())
    return {
        "name": user.get("name", "User"),
        "picture": user.get("picture", ""),
        "member_since": member_since,
        "total_messages": total_msgs,
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "total_checkins": total_checkins,
        "streak": streak,
        "total_focus_sessions": total_focus,
        "total_focus_minutes": focus_mins,
        "total_xp": total_xp,
    }

# ─── LANGUAGES ───

@api_router.get("/languages")
async def get_languages():
    return SUPPORTED_LANGUAGES

# ─── BHAIYA WRAPPED ───

@api_router.get("/wrapped")
async def get_wrapped(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    user_name = user.get("name", "there")
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    # Gather all data
    total_msgs = await db.chat_messages.count_documents({"user_id": uid, "role": "user"})
    month_msgs = await db.chat_messages.count_documents({"user_id": uid, "role": "user", "created_at": {"$gte": month_ago}})
    total_goals = await db.goals.count_documents({"user_id": uid})
    completed_goals = await db.goals.count_documents({"user_id": uid, "completed": True})
    total_checkins = await db.checkins.count_documents({"user_id": uid})
    month_checkins = await db.checkins.find({"user_id": uid, "created_at": {"$gte": month_ago}}, {"_id": 0}).to_list(60)
    focus_sessions = await db.focus_sessions.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(200)
    month_focus = [s for s in focus_sessions if s.get("started_at", "") >= month_ago]
    focus_mins = sum(s.get("duration_minutes", 0) for s in month_focus)
    total_focus_mins = sum(s.get("duration_minutes", 0) for s in focus_sessions)
    challenges_done = await db.challenge_completions.count_documents({"user_id": uid})
    month_challenges = await db.challenge_completions.count_documents({"user_id": uid, "completed_at": {"$gte": month_ago}})
    xp_docs = await db.challenge_completions.find({"user_id": uid}, {"_id": 0, "xp": 1}).to_list(500)
    total_xp = sum(d.get("xp", 0) for d in xp_docs)
    # Mode usage
    mode_msgs = await db.chat_messages.find({"user_id": uid, "role": "assistant", "mode": {"$exists": True}}, {"_id": 0, "mode": 1}).to_list(500)
    mode_counts = {}
    for m in mode_msgs:
        mode = m.get("mode", "general")
        mode_counts[mode] = mode_counts.get(mode, 0) + 1
    top_mode = max(mode_counts, key=mode_counts.get) if mode_counts else "general"
    # Mood analysis
    avg_energy = 0
    mood_counts = {}
    if month_checkins:
        avg_energy = round(sum(c.get("energy_level", 5) for c in month_checkins) / len(month_checkins), 1)
        for c in month_checkins:
            mood = c.get("mood", "neutral")
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    # Recent goals
    recent_goals = await db.goals.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    goal_names = [g["title"] for g in recent_goals]
    # Streak
    streak = 0
    all_checkins = await db.checkins.find({"user_id": uid}, {"_id": 0, "created_at": 1}).sort("created_at", -1).to_list(60)
    if all_checkins:
        today = datetime.now(timezone.utc).date()
        for i, c in enumerate(all_checkins):
            ca = c.get("created_at", "")
            if isinstance(ca, str):
                try:
                    d = datetime.fromisoformat(ca).date()
                except Exception:
                    break
            else:
                d = ca.date() if hasattr(ca, 'date') else today
            if d == today - timedelta(days=i):
                streak += 1
            else:
                break
    wrapped_data = {
        "name": user_name,
        "picture": user.get("picture", ""),
        "period": f"{(datetime.now(timezone.utc) - timedelta(days=30)).strftime('%b %d')} - {datetime.now(timezone.utc).strftime('%b %d, %Y')}",
        "total_messages": total_msgs,
        "month_messages": month_msgs,
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "total_checkins": total_checkins,
        "month_checkins": len(month_checkins),
        "focus_minutes_month": focus_mins,
        "focus_minutes_total": total_focus_mins,
        "focus_sessions_month": len(month_focus),
        "challenges_month": month_challenges,
        "challenges_total": challenges_done,
        "total_xp": total_xp,
        "streak": streak,
        "avg_energy": avg_energy,
        "top_mood": top_mood,
        "mood_breakdown": mood_counts,
        "top_mode": top_mode,
        "mode_breakdown": mode_counts,
        "recent_goals": goal_names,
    }
    # Generate AI wrapped summary
    prompt = f"""Generate a "Bhaiya Wrapped" — a monthly progress report for {user_name}, styled like Spotify Wrapped but for personal growth.

Stats this month:
- {month_msgs} messages with Bhaiya ({total_msgs} all-time)
- {completed_goals}/{total_goals} goals completed
- {len(month_checkins)} check-ins, avg energy {avg_energy}/10, top mood: {top_mood}
- {len(month_focus)} focus sessions ({focus_mins} minutes)
- {month_challenges} challenges completed, {total_xp} total XP
- Top AI mode used: {top_mode}
- Current streak: {streak} days
- Goals: {', '.join(goal_names) if goal_names else 'None set'}

Write 4 short sections:
1. HIGHLIGHT: One-line brag stat (most impressive thing)
2. PERSONALITY: What their usage says about them (be specific and fun)
3. GROWTH: Where they've improved
4. NEXT LEVEL: One specific challenge for next month

Keep each section 1-2 sentences. Be real, witty, and personal. No generic fluff."""
    try:
        chat = LlmChat(
            api_key=ANTHROPIC_API_KEY,
            session_id=f"wrapped_{uid}_{uuid.uuid4().hex[:6]}",
            system_message="You are Anushka Didi, generating a monthly Wrapped report for a child. Be warm, encouraging, and fun."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        ai_wrapped = await chat.send_message(UserMessage(text=prompt))
        wrapped_data["ai_wrapped"] = ai_wrapped
    except Exception as e:
        logger.error(f"Wrapped AI error: {e}")
        wrapped_data["ai_wrapped"] = f"Hey {user_name}! You've been crushing it with {month_msgs} messages, {completed_goals} goals done, and {focus_mins} minutes of focused work. Keep that energy going!"
    return wrapped_data

# ─── ROOT ───

@api_router.get("/")
async def root():
    return {"message": "Anushka Didi AI API"}

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
