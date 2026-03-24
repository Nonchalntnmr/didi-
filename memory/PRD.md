# Bhaiya AI - PRD

## Problem Statement
Build "Bhaiya AI" — a real-time, intelligent AI mentor platform for teens/young adults. Not a chatbot, but a high-performing supportive older brother.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB (11 collections: users, user_sessions, chat_messages, avatar_configs, goals, checkins, focus_sessions, daily_challenges, challenge_completions, routines, routine_logs)
- **AI**: Claude Sonnet 4.5 via emergentintegrations library (user's Anthropic API key)
- **Auth**: Emergent Google OAuth
- **Voice**: Browser Web Speech API (SpeechRecognition + SpeechSynthesis) + Claude

## Implemented Features (March 24, 2026)
### Core
- Premium dark UI (Manrope + JetBrains Mono, Obsidian/Blue palette)
- Emergent Google OAuth authentication
- 7 AI conversation modes (Educator, Coach, Wellness, Listener, General, Future You, Brutal Honesty)
- Memory-aware AI responses (last 15 messages + goals + check-ins as context)

### Pages (10 total)
1. Landing Page - Hero with gradient text, features grid, modes showcase, social proof, CTA
2. Dashboard - Gradient hero, Call Bhaiya card, 4 action cards, 5 quick buttons, check-in, stats, goals
3. Chat - Mode selector, streaming animation, quick actions, clear history
4. Call Bhaiya - Voice call with SpeechRecognition/Synthesis, waveform, camera
5. Avatar Customize - Face/skin/hair/outfit presets, personality sliders (strict/humor/verbosity), voice
6. Focus Mode - Pomodoro timer (15/25/50/90 min), tips, session history
7. Challenges - 3 daily challenges from 20-pool, XP system, streaks, difficulty badges
8. Routines - Study plans with steps, categories, daily logging, 7-day calendar
9. Weekly Summary - AI-generated analysis, stats breakdown, mood charts
10. Progress Card - Shareable stats card

### Backend (33+ endpoints)
- Auth (session exchange, /me, logout)
- Chat with Claude AI
- Avatar config CRUD
- Goals CRUD
- Check-ins (create, latest, history)
- Focus sessions (start, end, history)
- Challenges (today, complete, streak)
- Routines CRUD + daily logging
- Weekly AI summary
- Progress card data
- Enhanced stats

## Remaining Backlog
### P1
- Push notifications / reminders
- Mobile PWA optimization
- OpenAI Realtime Voice API (higher quality voice)

### P2
- Pinecone vector DB for long-term memory
- PDF export for progress reports
- Community leaderboard
