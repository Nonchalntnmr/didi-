# Bhaiya AI - PRD

## Problem Statement
Build "Bhaiya AI" — a real-time, intelligent AI mentor platform for teens/young adults. Not a chatbot, but a high-performing supportive older brother who teaches, guides, keeps accountable, and talks like a real person.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB (users, sessions, chat_messages, avatar_configs, goals, checkins)
- **AI**: Claude Sonnet 4.5 via emergentintegrations library (Anthropic API key)
- **Auth**: Emergent Google OAuth
- **Voice**: Browser Web Speech API (SpeechRecognition + SpeechSynthesis) + Claude

## User Personas
- **Primary**: Teens and young adults (16-25) who want self-improvement
- **Secondary**: Ambitious, tech-savvy individuals who value accountability

## Core Requirements
- AI-powered mentorship chat with memory
- Voice call mode ("Call Bhaiya")
- Avatar customization (appearance + personality sliders)
- Auto-detection of conversation mode (Educator, Coach, Wellness, Listener)
- Daily check-ins and goal tracking
- Premium dark UI aesthetic

## What's Been Implemented (March 24, 2026)
- Landing page with hero, features bento grid, CTA
- Emergent Google OAuth authentication
- Dashboard with action cards, daily check-in, goals, stats
- Chat page with Claude AI, typing animation, quick actions, mode indicator
- Call Bhaiya voice mode (Web Speech API + Claude + SpeechSynthesis)
- Avatar customization (face, skin, hair, outfit presets + personality sliders)
- Full CRUD for goals, check-ins, chat history
- Memory system (last 15 messages + goals + check-ins as context)
- Agent mode auto-detection (Educator, Coach, Wellness, Listener)
- All backend APIs tested and passing (15/15)
- All frontend pages tested and passing

## Prioritized Backlog

### P0 (Next Phase)
- Weekly progress summary reports
- Focus Mode (timed deep work sessions)
- Challenge Mode (daily tasks + streaks)

### P1
- Future You Mode (Bhaiya speaks as user's future self)
- Brutal Honesty Mode (direct feedback toggle)
- Long-term memory extraction (auto-extract key facts from conversations)
- Richer avatar visuals (AI-generated or illustrated presets)

### P2
- OpenAI Realtime Voice API integration (higher quality voice)
- Pinecone vector DB for advanced long-term memory
- Mobile-optimized PWA
- Notification system (daily reminders)
- Export progress reports as PDF

## Next Tasks
1. Weekly summary generation from check-ins and goals
2. Focus Mode timer with Bhaiya guidance
3. Challenge Mode with streak tracking
4. Enhanced memory extraction from conversations
5. Mobile responsiveness polish
