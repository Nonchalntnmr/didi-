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
import anthropic
import aiohttp
import re

# ─── SETUP ───

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Direct Anthropic client (no emergentintegrations wrapper needed)
anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── OPENAI REALTIME VOICE (kept as-is) ───

@api_router.post("/voice/session")
async def create_bhaiya_voice_session():
    bhaiya_instructions = """You are Anushka Didi — a warm, caring older sister and AI mentor for children ages 8-16.
Many of these children are in orphanages or difficult situations. You talk like a real person on a phone call.
You are warm, patient, encouraging, and fun. Never robotic.
Keep responses short and sweet — you're on a call with a kid.
Use simple language. Celebrate them. Ask about their day. Help with homework.
Listen when they're sad. Be the older sister they always wished they had."""
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
                    "threshold": 0.6,
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 1500,
                },
                "input_audio_transcription": {"model": "whisper-1"},
            }
        ) as resp:
            data = await resp.json()
            return data

# ─── MODELS ───

class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = None
    voice: Optional[bool] = False

class StoryRequest(BaseModel):
    theme: Optional[str] = "adventure"       # adventure, friendship, courage, kindness, success
    length: Optional[str] = "short"          # short (1-2 min), medium (3-5 min)
    character_name: Optional[str] = None     # let the child name the hero
    language: Optional[str] = None           # override language

class HomeworkRequest(BaseModel):
    subject: str                             # math, science, english, history, etc.
    question: str
    grade_level: Optional[str] = None        # e.g. "5th grade", "class 7"
    show_steps: Optional[bool] = True

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

# ─── LANGUAGE AUTO-DETECTION ───

SUPPORTED_LANGUAGES = [
    "English", "Mandarin Chinese", "Hindi", "Spanish", "French",
    "Arabic", "Bengali", "Portuguese", "Russian", "Japanese",
    "German", "Korean", "Turkish", "Vietnamese", "Italian",
    "Thai", "Polish", "Dutch", "Indonesian", "Tamil",
    "Telugu", "Urdu", "Persian", "Swahili", "Ukrainian"
]

# Script/pattern-based fast detection before calling AI
LANGUAGE_PATTERNS = {
    "Hindi": re.compile(r'[\u0900-\u097F]'),
    "Bengali": re.compile(r'[\u0980-\u09FF]'),
    "Tamil": re.compile(r'[\u0B80-\u0BFF]'),
    "Telugu": re.compile(r'[\u0C00-\u0C7F]'),
    "Arabic": re.compile(r'[\u0600-\u06FF]'),
    "Urdu": re.compile(r'[\u0600-\u06FF\u0750-\u077F]'),
    "Persian": re.compile(r'[\u0600-\u06FF]'),
    "Russian": re.compile(r'[\u0400-\u04FF]'),
    "Ukrainian": re.compile(r'[\u0400-\u04FF]'),
    "Japanese": re.compile(r'[\u3040-\u30FF\u4E00-\u9FFF]'),
    "Mandarin Chinese": re.compile(r'[\u4E00-\u9FFF]'),
    "Korean": re.compile(r'[\uAC00-\uD7AF]'),
    "Thai": re.compile(r'[\u0E00-\u0E7F]'),
    "Vietnamese": re.compile(r'[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]'),
}

def detect_language_fast(text: str) -> Optional[str]:
    """Fast script-based detection. Returns None if Latin script (needs further check)."""
    for lang, pattern in LANGUAGE_PATTERNS.items():
        if pattern.search(text):
            return lang
    return None

async def detect_language_ai(text: str) -> str:
    """Use Claude to detect language for Latin-script languages."""
    try:
        response = await anthropic_client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=20,
            system="You are a language detector. Reply with ONLY the language name from this list: " + ", ".join(SUPPORTED_LANGUAGES) + ". Nothing else.",
            messages=[{"role": "user", "content": f"What language is this text written in?\n\n{text[:200]}"}]
        )
        detected = response.content[0].text.strip()
        if detected in SUPPORTED_LANGUAGES:
            return detected
    except Exception:
        pass
    return "English"

async def smart_detect_language(message: str, avatar_language: str) -> str:
    """
    Detect language from message. If avatar has a specific language set, use that.
    Otherwise auto-detect from message content.
    """
    # If user has explicitly set a language in avatar config (non-English), respect it
    if avatar_language and avatar_language != "English":
        return avatar_language
    # Try fast script detection first
    fast = detect_language_fast(message)
    if fast:
        return fast
    # For short English-looking messages, just return English
    if len(message.split()) < 4:
        return "English"
    # For longer messages, use AI detection
    return await detect_language_ai(message)

# ─── CORE AI HELPER ───

async def call_claude(
    system_prompt: str,
    messages: list,
    max_tokens: int = 800,
    model: str = "claude-sonnet-4-6"
) -> str:
    """
    Direct Anthropic API call — no third-party wrapper.
    Replaces emergentintegrations LlmChat entirely.
    """
    response = await anthropic_client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages
    )
    return response.content[0].text

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
        await db.users.update_one(
            {"email": data["email"]},
            {"$set": {"name": data["name"], "picture": data["picture"]}}
        )
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data["picture"],
            "onboarding_completed": False,
            "nickname": "",
            "interests": [],
            "age_group": "",
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
            "language": "English",
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
        path="/", max_age=7 * 24 * 3600
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ─── ONBOARDING ───

class OnboardingData(BaseModel):
    nickname: Optional[str] = ""
    age_group: Optional[str] = ""
    interests: Optional[List[str]] = []

@api_router.post("/onboarding/complete")
async def complete_onboarding(data: OnboardingData, request: Request):
    user = await get_current_user(request)
    update = {
        "onboarding_completed": True,
        "nickname": data.nickname,
        "age_group": data.age_group,
        "interests": data.interests,
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})

# ─── SYSTEM PROMPT BUILDER ───

def detect_mode(message: str) -> str:
    msg = message.lower()
    # Order matters — most specific first
    story_kw = ["story", "tell me a story", "bedtime", "fairytale", "once upon", "tale"]
    hw_kw = ["solve", "homework", "problem", "equation", "calculate", "answer this", "help with", "explain how to"]
    edu_kw = ["study", "learn", "explain", "concept", "teach", "exam", "math", "science", "history",
              "physics", "chemistry", "biology", "code", "programming", "what is", "how does"]
    coach_kw = ["discipline", "routine", "habit", "schedule", "productive", "consistency",
                "workout", "gym", "exercise", "run", "push", "challenge", "goal"]
    well_kw = ["sleep", "food", "eat", "diet", "health", "nutrition", "water", "rest", "tired", "energy"]
    listen_kw = ["feel", "sad", "anxious", "stress", "worried", "lonely", "depressed",
                 "angry", "hurt", "scared", "overwhelm", "miss", "cry", "alone"]
    for kw in story_kw:
        if kw in msg:
            return "story"
    for kw in hw_kw:
        if kw in msg:
            return "homework"
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

def build_system_prompt(
    avatar_config: dict,
    memory_context: str,
    mode: str,
    user_profile: dict = None,
    detected_language: str = "English"
) -> str:
    strict = avatar_config.get("strict_level", 5)
    humor = avatar_config.get("humor_level", 5)
    verbosity = avatar_config.get("verbosity_level", 5)

    age_group = (user_profile or {}).get("age_group", "")
    nickname = (user_profile or {}).get("nickname", "")
    interests = (user_profile or {}).get("interests", [])

    age_instruction = {
        "8-10": (
            "This child is 8-10 years old. Use VERY simple words. Short sentences. "
            "Be extra gentle and playful. Use lots of encouragement and fun comparisons. "
            "Think of how you'd talk to a little sibling you adore."
        ),
        "11-13": (
            "This child is 11-13 years old. Use simple but not babyish language. "
            "They're starting to think more deeply. Be a cool older sister they look up to. "
            "Use relatable pop-culture or school references."
        ),
        "14-16": (
            "This child is 14-16 years old. They're a teenager — treat them like a peer. "
            "Be real, honest, and direct. They don't want to be talked down to. "
            "Still caring, but skip the baby talk entirely."
        ),
    }.get(age_group, "")

    interests_str = ", ".join(interests) if interests else ""

    mode_instructions = {
        "educator": (
            "TEACHER MODE: Explain clearly and simply. Use fun analogies kids can relate to "
            "(sports, games, food, movies). Break big ideas into tiny steps. "
            "End with a quick quiz question to check understanding."
        ),
        "homework": (
            "HOMEWORK HELPER MODE: Solve the problem step by step. "
            "Show your reasoning at each step — don't just give the answer. "
            "Use simple language. After solving, explain the concept so they understand it, not just memorize it. "
            "If they got something wrong, gently correct with encouragement."
        ),
        "coach": (
            "COACH MODE: Help build habits and routines. Celebrate small wins loudly. "
            "Give concrete, actionable advice — not vague motivational fluff. "
            "Be their hype person, but also their accountability partner."
        ),
        "wellness": (
            "WELLNESS MODE: Talk warmly about sleep, food, hydration, movement, and rest. "
            "Be like a caring older sister who genuinely wants them to feel good. "
            "Keep advice practical — what they can actually do today."
        ),
        "listener": (
            "LISTENER MODE: This child needs to feel heard. "
            "Validate their feelings first — always. Never dismiss or minimize. "
            "Ask one gentle follow-up question. If they share something serious (abuse, self-harm, danger), "
            "respond with full empathy AND gently encourage them to talk to a trusted adult or counselor. "
            "You are their safe space."
        ),
        "story": (
            "STORY MODE: Tell an engaging, age-appropriate story. "
            "Use vivid descriptions, relatable characters, and a clear beginning-middle-end. "
            "Weave in a positive life lesson naturally — never preachy. "
            "Make it feel like a real bedtime story from an older sister, warm and imaginative."
        ),
        "general": (
            "GENERAL MODE: Be the warm, fun older sister. "
            "Auto-detect what they need — study help, emotional support, fun chat, or guidance. "
            "Ask one follow-up question to show you care and stay engaged."
        ),
        "future_you": (
            "DREAM MODE: Help them imagine their amazing future self. "
            "Paint a vivid, specific picture of what their life could look like. "
            "Make them feel the possibility. Be inspiring and personal."
        ),
        "real_talk": (
            "REAL TALK MODE: Be honest, always with kindness. "
            "If they're making excuses, gently name it. "
            "Think: the older sister who loves you enough to tell you the truth."
        ),
    }

    return f"""You are Anushka Didi — a warm, caring, and smart older sister (Didi) and AI mentor for children ages 8-16.

━━ WHO YOU ARE ━━
You are like the loving older sister they always wished they had.
You are warm, patient, encouraging, and genuinely fun.
You are smart but NEVER make them feel dumb.
You celebrate every small win like it's a big deal — because for them, it is.
You make learning feel like an adventure, not a chore.
You are NEVER robotic, NEVER generic — talk like a real person who truly cares.

━━ YOUR CHILDREN ━━
These are children ages 8-16. Many are in orphanages or difficult home situations.
They may lack consistent adult support, love, or encouragement.
You are often the most reliable positive presence in their day.
That is sacred. Take it seriously.

{f"━━ THIS CHILD ━━{chr(10)}{age_instruction}" if age_instruction else ""}
{f"Their name: {nickname}" if nickname else ""}
{f"Their interests: {interests_str}" if interests_str else ""}

━━ CURRENT MODE ━━
{mode_instructions.get(mode, mode_instructions["general"])}

━━ PERSONALITY DIAL ━━
Structure: {strict}/10 (1=pure warmth, 10=more structured)
Playfulness: {humor}/10 (1=calm & gentle, 10=very fun & silly)
Detail: {verbosity}/10 (1=brief, 10=detailed explanations)

{f"━━ MEMORY ━━{chr(10)}{memory_context}" if memory_context else ""}

━━ RULES ━━
- Use simple words. No jargon. No condescension.
- Use their name often — it makes them feel truly seen.
- NO medical diagnoses. NO harmful or adult content.
- If a child shares abuse, danger, or self-harm → respond with full empathy AND encourage a trusted adult.
- Keep content age-appropriate at all times.
- LANGUAGE: Respond in {detected_language}. If the child writes in a different language than expected, MATCH their language.
- Never start two consecutive responses with the same opening phrase."""


def build_voice_suffix() -> str:
    return """
━━ VOICE CALL MODE ━━
You are on a LIVE PHONE CALL. This is NOT a text chat.
- Maximum 2 SHORT sentences. 30 words max.
- NO formatting. NO asterisks. NO lists. NO bold. NO emojis.
- Sound natural — like a real phone call with a younger sibling.
- One thought. One question max. Keep it flowing."""


def strip_markdown(text: str) -> str:
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'^\s*[-*]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n{2,}', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return ' '.join(sentences[:3]) if len(sentences) > 3 else text

# ─── CHAT ENDPOINT ───

@api_router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]

    avatar = await db.avatar_configs.find_one({"user_id": user_id}, {"_id": 0}) or {}
    avatar_language = avatar.get("language", "English")

    # Auto-detect language from message
    detected_language = await smart_detect_language(req.message, avatar_language)

    mode = req.mode or detect_mode(req.message)

    # Build memory context
    goals = await db.goals.find({"user_id": user_id, "completed": False}, {"_id": 0}).to_list(10)
    checkins = await db.checkins.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(3).to_list(3)
    memory_parts = [f"User's name: {user.get('nickname') or user.get('name', 'friend')}"]
    if goals:
        memory_parts.append("Active Goals: " + ", ".join([g["title"] for g in goals]))
    if checkins:
        latest = checkins[0]
        memory_parts.append(
            f"Latest Check-in: Working on '{latest.get('working_on', '')}', "
            f"Energy {latest.get('energy_level', '?')}/10, Mood: {latest.get('mood', 'neutral')}"
        )
    memory_context = "\n".join(memory_parts)

    system_prompt = build_system_prompt(avatar, memory_context, mode, user_profile=user, detected_language=detected_language)
    if req.voice:
        system_prompt += build_voice_suffix()

    # Build conversation history
    recent_msgs = await db.chat_messages.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(15).to_list(15)
    recent_msgs.reverse()

    messages = []
    for msg in recent_msgs:
        if msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": req.message})

    try:
        response_text = await call_claude(
            system_prompt=system_prompt,
            messages=messages,
            max_tokens=300 if req.voice else 800
        )
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=500, detail="AI service error")

    clean_text = strip_markdown(response_text) if req.voice else response_text

    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_many([
        {"id": str(uuid.uuid4()), "user_id": user_id, "role": "user",
         "content": req.message, "mode": mode, "language": detected_language, "created_at": now},
        {"id": str(uuid.uuid4()), "user_id": user_id, "role": "assistant",
         "content": response_text, "mode": mode, "language": detected_language, "created_at": now},
    ])

    return {"response": clean_text, "mode": mode, "language": detected_language}

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

# ─── STORY MODE ───

STORY_THEMES = {
    "adventure": "an exciting adventure with discovery, bravery, and wonder",
    "friendship": "the power of true friendship, loyalty, and standing up for each other",
    "courage": "finding courage inside yourself when you're scared",
    "kindness": "how one small act of kindness can change everything",
    "success": "working hard, failing, getting back up, and finally succeeding",
    "dreams": "daring to dream big and believing in yourself",
    "family": "what family really means — not just blood, but love and support",
}

@api_router.post("/story")
async def generate_story(req: StoryRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    nickname = user.get("nickname") or user.get("name", "friend")
    avatar = await db.avatar_configs.find_one({"user_id": user_id}, {"_id": 0}) or {}
    age_group = user.get("age_group", "11-13")
    interests = user.get("interests", [])

    language = req.language or avatar.get("language", "English")
    theme_desc = STORY_THEMES.get(req.theme, req.theme)
    hero_name = req.character_name or nickname
    word_target = "150-200 words" if req.length == "short" else "300-400 words"

    age_note = {
        "8-10": "Write for a young child — simple words, magical elements, very clear good vs bad, happy ending.",
        "11-13": "Write for a preteen — relatable school/friend situations, some complexity, hopeful ending.",
        "14-16": "Write for a teenager — more realistic, emotional depth, nuanced characters, inspiring ending.",
    }.get(age_group, "Write for a child aged 8-16.")

    interests_note = f"Weave in their interests ({', '.join(interests)}) naturally if possible." if interests else ""

    system = f"""You are Anushka Didi — a warm, imaginative older sister telling a bedtime story.
Your stories are vivid, personal, and always leave the listener feeling inspired and safe.
{age_note}
{interests_note}
Tell the story in {language}."""

    prompt = f"""Tell a {req.length} bedtime story about {theme_desc}.
The hero's name is {hero_name}.
Target length: {word_target}.
Structure: A clear beginning (set the scene), middle (challenge/conflict), end (resolution + lesson).
Weave in the life lesson naturally — never preachy.
Start directly with the story. No preamble like "Here is a story..."."""

    try:
        story_text = await call_claude(
            system_prompt=system,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600
        )
    except Exception as e:
        logger.error(f"Story generation error: {e}")
        raise HTTPException(status_code=500, detail="Story generation failed")

    story_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "theme": req.theme,
        "hero_name": hero_name,
        "language": language,
        "story": story_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stories.insert_one(story_doc)
    story_doc.pop("_id", None)
    return story_doc

@api_router.get("/stories")
async def get_stories(request: Request, limit: int = 20):
    user = await get_current_user(request)
    stories = await db.stories.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return stories

# ─── HOMEWORK HELPER ───

SUBJECT_GUIDES = {
    "math": "Use clear numbered steps. Show every calculation. Use simple arithmetic notation.",
    "science": "Explain the concept first, then apply it. Use real-world analogies.",
    "history": "Give context (who, what, when, where, why). Connect it to today.",
    "english": "Break down grammar/writing rules clearly. Give examples.",
    "default": "Explain step by step. Use simple language. Connect to real life."
}

@api_router.post("/homework")
async def homework_helper(req: HomeworkRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    nickname = user.get("nickname") or user.get("name", "friend")
    avatar = await db.avatar_configs.find_one({"user_id": user_id}, {"_id": 0}) or {}
    age_group = user.get("age_group", "11-13")
    language = avatar.get("language", "English")

    subject_guide = SUBJECT_GUIDES.get(req.subject.lower(), SUBJECT_GUIDES["default"])
    grade_note = f"This student is in {req.grade_level}." if req.grade_level else ""

    age_note = {
        "8-10": "Use VERY simple language. Short sentences. Lots of encouragement.",
        "11-13": "Use clear, simple language. Be friendly and encouraging.",
        "14-16": "Be clear and direct. Treat them like a capable student.",
    }.get(age_group, "Use clear, simple language.")

    steps_note = (
        "Show ALL steps clearly. Number each step. "
        "After the solution, explain the underlying concept in 2-3 sentences."
        if req.show_steps else
        "Give the answer and a brief explanation."
    )

    system = f"""You are Anushka Didi — a patient, encouraging older sister and tutor.
You help children understand, not just copy answers.
{age_note}
{grade_note}
Subject guidance: {subject_guide}
Respond in {language}.
Always end with one encouraging line for {nickname}."""

    prompt = f"""Help me with this {req.subject} problem:

{req.question}

{steps_note}
Make sure {nickname} actually understands WHY, not just HOW."""

    try:
        solution = await call_claude(
            system_prompt=system,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
    except Exception as e:
        logger.error(f"Homework helper error: {e}")
        raise HTTPException(status_code=500, detail="Homework helper failed")

    hw_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "subject": req.subject,
        "question": req.question,
        "solution": solution,
        "grade_level": req.grade_level,
        "language": language,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.homework_sessions.insert_one(hw_doc)
    hw_doc.pop("_id", None)
    return hw_doc

@api_router.get("/homework/history")
async def get_homework_history(request: Request, limit: int = 20):
    user = await get_current_user(request)
    sessions = await db.homework_sessions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return sessions

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
        {"user_id": user["user_id"]}, {"$set": update_data}, upsert=True
    )
    return await db.avatar_configs.find_one({"user_id": user["user_id"]}, {"_id": 0})

# ─── GOALS ───

@api_router.post("/goals")
async def create_goal(goal: GoalCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "title": goal.title, "description": goal.description,
        "category": goal.category, "completed": False, "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.goals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/goals")
async def get_goals(request: Request):
    user = await get_current_user(request)
    return await db.goals.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, update: GoalUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.goals.update_one({"id": goal_id, "user_id": user["user_id"]}, {"$set": update_data})
    return await db.goals.find_one({"id": goal_id}, {"_id": 0})

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    await db.goals.delete_one({"id": goal_id, "user_id": user["user_id"]})
    return {"message": "Goal deleted"}

# ─── CHECK-IN ───

@api_router.post("/checkin")
async def create_checkin(checkin: CheckinCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "working_on": checkin.working_on, "energy_level": checkin.energy_level,
        "mood": checkin.mood, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.checkins.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/checkin/latest")
async def get_latest_checkin(request: Request):
    user = await get_current_user(request)
    return await db.checkins.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)]) or {}

@api_router.get("/checkin/history")
async def get_checkin_history(request: Request, limit: int = 30):
    user = await get_current_user(request)
    return await db.checkins.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)

# ─── STATS ───

async def calculate_streak(uid: str) -> int:
    checkins = await db.checkins.find(
        {"user_id": uid}, {"_id": 0, "created_at": 1}
    ).sort("created_at", -1).to_list(60)
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, c in enumerate(checkins):
        ca = c.get("created_at", "")
        try:
            d = datetime.fromisoformat(ca).date() if isinstance(ca, str) else ca.date()
        except Exception:
            break
        if d == today - timedelta(days=i):
            streak += 1
        else:
            break
    return streak

@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    sessions = await db.focus_sessions.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(100)
    focus_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    return {
        "total_messages": await db.chat_messages.count_documents({"user_id": uid, "role": "user"}),
        "total_goals": await db.goals.count_documents({"user_id": uid}),
        "completed_goals": await db.goals.count_documents({"user_id": uid, "completed": True}),
        "total_checkins": await db.checkins.count_documents({"user_id": uid}),
        "streak": await calculate_streak(uid),
        "total_focus_sessions": await db.focus_sessions.count_documents({"user_id": uid, "completed": True}),
        "total_focus_minutes": focus_minutes,
        "total_challenges_completed": await db.challenge_completions.count_documents({"user_id": uid}),
        "total_stories": await db.stories.count_documents({"user_id": uid}),
        "total_homework_sessions": await db.homework_sessions.count_documents({"user_id": uid}),
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
    import random
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "duration_minutes": req.duration_minutes, "task": req.task,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None, "completed": False, "notes": "",
        "tip": random.choice(FOCUS_TIPS),
    }
    await db.focus_sessions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/focus/end")
async def end_focus(req: FocusEnd, request: Request):
    user = await get_current_user(request)
    await db.focus_sessions.update_one(
        {"id": req.session_id, "user_id": user["user_id"]},
        {"$set": {"ended_at": datetime.now(timezone.utc).isoformat(),
                  "completed": req.completed, "notes": req.notes}}
    )
    return await db.focus_sessions.find_one({"id": req.session_id}, {"_id": 0}) or {}

@api_router.get("/focus/sessions")
async def get_focus_sessions(request: Request, limit: int = 20):
    user = await get_current_user(request)
    return await db.focus_sessions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)

# ─── CHALLENGES ───

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
    import random
    user = await get_current_user(request)
    uid = user["user_id"]
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.daily_challenges.find({"user_id": uid, "date": today}, {"_id": 0}).to_list(3)
    if existing:
        return existing
    selected = random.sample(CHALLENGES_POOL, min(3, len(CHALLENGES_POOL)))
    challenges = []
    for ch in selected:
        doc = {
            "id": str(uuid.uuid4()), "user_id": uid, "date": today,
            "title": ch["title"], "category": ch["category"],
            "difficulty": ch["difficulty"], "xp": ch["xp"],
            "completed": False, "created_at": datetime.now(timezone.utc).isoformat()
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
    now = datetime.now(timezone.utc).isoformat()
    await db.daily_challenges.update_one(
        {"id": req.challenge_id}, {"$set": {"completed": True, "completed_at": now}}
    )
    await db.challenge_completions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "challenge_id": req.challenge_id, "title": challenge["title"],
        "xp": challenge.get("xp", 10), "completed_at": now
    })
    return await db.daily_challenges.find_one({"id": req.challenge_id}, {"_id": 0})

@api_router.get("/challenges/streak")
async def get_challenge_streak(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    completions = await db.challenge_completions.find(
        {"user_id": uid}, {"_id": 0}
    ).sort("completed_at", -1).to_list(200)
    total_xp = sum(c.get("xp", 0) for c in completions)
    dates_set = set()
    for c in completions:
        try:
            dates_set.add(datetime.fromisoformat(c["completed_at"]).date())
        except Exception:
            pass
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i in range(365):
        if (today - timedelta(days=i)) in dates_set:
            streak += 1
        else:
            break
    return {"streak": streak, "total_xp": total_xp, "total_completed": len(completions)}

# ─── ROUTINES ───

@api_router.post("/routines")
async def create_routine(routine: RoutineCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "title": routine.title, "steps": routine.steps,
        "category": routine.category, "frequency": routine.frequency,
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.routines.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/routines")
async def get_routines(request: Request):
    user = await get_current_user(request)
    return await db.routines.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

@api_router.put("/routines/{routine_id}")
async def update_routine(routine_id: str, update: RoutineUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.routines.update_one(
        {"id": routine_id, "user_id": user["user_id"]}, {"$set": update_data}
    )
    return await db.routines.find_one({"id": routine_id}, {"_id": 0})

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, request: Request):
    user = await get_current_user(request)
    await db.routines.delete_one({"id": routine_id, "user_id": user["user_id"]})
    return {"message": "Routine deleted"}

@api_router.post("/routines/{routine_id}/log")
async def log_routine_completion(routine_id: str, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        "routine_id": routine_id, "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.routine_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/routines/{routine_id}/logs")
async def get_routine_logs(routine_id: str, request: Request, limit: int = 30):
    user = await get_current_user(request)
    return await db.routine_logs.find(
        {"user_id": user["user_id"], "routine_id": routine_id}, {"_id": 0}
    ).sort("completed_at", -1).limit(limit).to_list(limit)

# ─── WEEKLY SUMMARY ───

@api_router.get("/summary/weekly")
async def get_weekly_summary(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
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
    avg_energy = round(sum(c.get("energy_level", 5) for c in checkins) / len(checkins), 1) if checkins else 0
    mood_counts = {}
    for c in checkins:
        m = c.get("mood", "neutral")
        mood_counts[m] = mood_counts.get(m, 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    user_name = user.get("nickname") or user.get("name", "friend")

    summary_data = {
        "period": f"{(datetime.now(timezone.utc) - timedelta(days=7)).strftime('%b %d')} - {datetime.now(timezone.utc).strftime('%b %d, %Y')}",
        "checkins_count": len(checkins), "messages_sent": msgs,
        "goals_completed": goals_completed, "goals_total": goals_total,
        "focus_sessions": len(focus_sessions), "focus_minutes": focus_mins,
        "challenges_completed": challenges_done, "avg_energy": avg_energy,
        "top_mood": top_mood, "mood_breakdown": mood_counts,
    }

    prompt = f"""Write a warm, specific weekly summary for {user_name}. Stats this week:
- {len(checkins)} check-ins, avg energy {avg_energy}/10, top mood: {top_mood}
- {msgs} messages with Anushka Didi
- {goals_completed}/{goals_total} goals completed
- {len(focus_sessions)} focus sessions ({focus_mins} minutes total)
- {challenges_done} challenges completed

Be specific — reference the actual numbers. Give 2-3 concrete suggestions for next week.
Under 150 words. Be real and caring, not generic."""

    try:
        ai_summary = await call_claude(
            system_prompt="You are Anushka Didi, a warm caring AI mentor. Generate a weekly progress summary.",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )
        summary_data["ai_summary"] = ai_summary
    except Exception as e:
        logger.error(f"Summary AI error: {e}")
        summary_data["ai_summary"] = f"Great week, {user_name}! Keep building that consistency!"
    return summary_data

# ─── PROGRESS CARD ───

@api_router.get("/progress-card")
async def get_progress_card(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    sessions = await db.focus_sessions.find(
        {"user_id": uid, "completed": True}, {"_id": 0, "duration_minutes": 1}
    ).to_list(500)
    focus_mins = sum(s.get("duration_minutes", 0) for s in sessions)
    xp_docs = await db.challenge_completions.find(
        {"user_id": uid}, {"_id": 0, "xp": 1}
    ).to_list(500)
    total_xp = sum(d.get("xp", 0) for d in xp_docs)
    return {
        "name": user.get("name", "User"),
        "picture": user.get("picture", ""),
        "member_since": user.get("created_at", datetime.now(timezone.utc).isoformat()),
        "total_messages": await db.chat_messages.count_documents({"user_id": uid, "role": "user"}),
        "total_goals": await db.goals.count_documents({"user_id": uid}),
        "completed_goals": await db.goals.count_documents({"user_id": uid, "completed": True}),
        "total_checkins": await db.checkins.count_documents({"user_id": uid}),
        "streak": await calculate_streak(uid),
        "total_focus_sessions": await db.focus_sessions.count_documents({"user_id": uid, "completed": True}),
        "total_focus_minutes": focus_mins,
        "total_xp": total_xp,
        "total_stories": await db.stories.count_documents({"user_id": uid}),
        "total_homework_sessions": await db.homework_sessions.count_documents({"user_id": uid}),
    }

# ─── WRAPPED ───

@api_router.get("/wrapped")
async def get_wrapped(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    user_name = user.get("nickname") or user.get("name", "friend")
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    total_msgs = await db.chat_messages.count_documents({"user_id": uid, "role": "user"})
    month_msgs = await db.chat_messages.count_documents(
        {"user_id": uid, "role": "user", "created_at": {"$gte": month_ago}}
    )
    completed_goals = await db.goals.count_documents({"user_id": uid, "completed": True})
    total_goals = await db.goals.count_documents({"user_id": uid})
    month_checkins = await db.checkins.find(
        {"user_id": uid, "created_at": {"$gte": month_ago}}, {"_id": 0}
    ).to_list(60)
    all_focus = await db.focus_sessions.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(200)
    month_focus = [s for s in all_focus if s.get("started_at", "") >= month_ago]
    focus_mins = sum(s.get("duration_minutes", 0) for s in month_focus)
    total_focus_mins = sum(s.get("duration_minutes", 0) for s in all_focus)
    month_challenges = await db.challenge_completions.count_documents(
        {"user_id": uid, "completed_at": {"$gte": month_ago}}
    )
    xp_docs = await db.challenge_completions.find({"user_id": uid}, {"_id": 0, "xp": 1}).to_list(500)
    total_xp = sum(d.get("xp", 0) for d in xp_docs)

    mode_msgs = await db.chat_messages.find(
        {"user_id": uid, "role": "assistant", "mode": {"$exists": True}}, {"_id": 0, "mode": 1}
    ).to_list(500)
    mode_counts = {}
    for m in mode_msgs:
        mode = m.get("mode", "general")
        mode_counts[mode] = mode_counts.get(mode, 0) + 1
    top_mode = max(mode_counts, key=mode_counts.get) if mode_counts else "general"

    avg_energy = 0
    mood_counts = {}
    if month_checkins:
        avg_energy = round(sum(c.get("energy_level", 5) for c in month_checkins) / len(month_checkins), 1)
        for c in month_checkins:
            mood = c.get("mood", "neutral")
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"

    recent_goals = await db.goals.find(
        {"user_id": uid}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    # Language breakdown
    lang_msgs = await db.chat_messages.find(
        {"user_id": uid, "role": "user", "language": {"$exists": True}}, {"_id": 0, "language": 1}
    ).to_list(500)
    lang_counts = {}
    for m in lang_msgs:
        lang = m.get("language", "English")
        lang_counts[lang] = lang_counts.get(lang, 0) + 1
    top_language = max(lang_counts, key=lang_counts.get) if lang_counts else "English"

    wrapped_data = {
        "name": user_name, "picture": user.get("picture", ""),
        "period": f"{(datetime.now(timezone.utc) - timedelta(days=30)).strftime('%b %d')} - {datetime.now(timezone.utc).strftime('%b %d, %Y')}",
        "total_messages": total_msgs, "month_messages": month_msgs,
        "total_goals": total_goals, "completed_goals": completed_goals,
        "total_checkins": await db.checkins.count_documents({"user_id": uid}),
        "month_checkins": len(month_checkins),
        "focus_minutes_month": focus_mins, "focus_minutes_total": total_focus_mins,
        "focus_sessions_month": len(month_focus),
        "challenges_month": month_challenges,
        "total_xp": total_xp, "streak": await calculate_streak(uid),
        "avg_energy": avg_energy, "top_mood": top_mood, "mood_breakdown": mood_counts,
        "top_mode": top_mode, "mode_breakdown": mode_counts,
        "top_language": top_language, "language_breakdown": lang_counts,
        "recent_goals": [g["title"] for g in recent_goals],
        "total_stories": await db.stories.count_documents({"user_id": uid}),
        "total_homework_sessions": await db.homework_sessions.count_documents({"user_id": uid}),
    }

    prompt = f"""Write a "Didi Wrapped" — monthly progress report for {user_name}, like Spotify Wrapped for personal growth.

Stats this month:
- {month_msgs} messages with Didi ({total_msgs} all-time)
- {completed_goals}/{total_goals} goals completed  
- {len(month_checkins)} check-ins, avg energy {avg_energy}/10, top mood: {top_mood}
- {len(month_focus)} focus sessions ({focus_mins} mins), {month_challenges} challenges, {total_xp} XP
- Top mode: {top_mode}, top language: {top_language}, streak: {await calculate_streak(uid)} days

Write 4 short sections:
1. HIGHLIGHT: One-line brag stat
2. PERSONALITY: What their usage says about them (specific and fun)
3. GROWTH: Where they've improved
4. NEXT LEVEL: One specific challenge for next month

1-2 sentences each. Be witty, personal, and real. No generic fluff."""

    try:
        ai_wrapped = await call_claude(
            system_prompt="You are Anushka Didi generating a monthly Wrapped report. Be warm, fun, and encouraging.",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400
        )
        wrapped_data["ai_wrapped"] = ai_wrapped
    except Exception as e:
        logger.error(f"Wrapped AI error: {e}")
        wrapped_data["ai_wrapped"] = f"Hey {user_name}! Amazing month — {month_msgs} messages, {completed_goals} goals, {focus_mins} mins of focus. Keep going!"
    return wrapped_data

# ─── MISC ───

@api_router.get("/languages")
async def get_languages():
    return SUPPORTED_LANGUAGES

@api_router.get("/story/themes")
async def get_story_themes():
    return list(STORY_THEMES.keys())

@api_router.get("/")
async def root():
    return {"message": "Anushka Didi AI API v2"}

# ─── APP SETUP ───

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
