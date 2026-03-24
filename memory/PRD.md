# Bhaiya AI - PRD

## Problem Statement
Build "Bhaiya AI" — a real-time, intelligent AI mentor platform for teens/young adults. Not a chatbot, but a high-performing supportive older brother who teaches, guides, keeps accountable, and talks like a real person.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB (users, sessions, chat_messages, avatar_configs, goals, checkins, focus_sessions, daily_challenges, challenge_completions, routines, routine_logs)
- **AI**: Claude Sonnet 4.5 via emergentintegrations library (Anthropic API key)
- **Auth**: Emergent Google OAuth
- **Voice**: Browser Web Speech API (SpeechRecognition + SpeechSynthesis) + Claude

## User Personas
- **Primary**: Teens and young adults (16-25) who want self-improvement
- **Secondary**: Ambitious, tech-savvy individuals who value accountability

## Core Requirements
- AI-powered mentorship chat with memory and 7 modes
- Voice call mode ("Call Bhaiya")
- Avatar customization (appearance + personality sliders)
- Focus Mode (Pomodoro-style deep work timer)
- Challenge Mode (daily challenges with XP + streaks)
- Routines/Study Plans (CRUD + daily logging + mini calendar)
- Weekly AI-Generated Summary
- Shareable Progress Card
- Daily check-ins and goal tracking
- Premium dark UI aesthetic

## What's Been Implemented

### Phase 1 (March 24, 2026)
- Landing page with hero, features bento grid, CTA
- Emergent Google OAuth authentication
- Dashboard with action cards, daily check-in, goals, stats
- Chat page with Claude AI, typing animation, quick actions, mode indicator
- Call Bhaiya voice mode (Web Speech API + Claude + SpeechSynthesis)
- Avatar customization (face, skin, hair, outfit presets + personality sliders)
- Full CRUD for goals, check-ins, chat history
- Memory system (last 15 messages + goals + check-ins as context)
- Agent mode auto-detection (Educator, Coach, Wellness, Listener)

### Phase 2 (March 24, 2026)
- Focus Mode with timer presets (15/25/50/90 min) + tips + session history
- Challenge Mode with 20 challenge pool, daily 3, XP system, streaks
- Routines/Study Plans with steps, categories, daily logging, 7-day calendar
- Weekly Summary with AI-generated analysis and stats
- Shareable Progress Card with stats snapshot
- Future You Mode (Bhaiya as user's future self)
- Brutal Honesty Mode (tough-love feedback)
- Enhanced stats (focus time, challenges completed, real streak calc)
- Dashboard with 8 action cards + quick links row

## All Features Complete
- 10 frontend pages (Landing, Dashboard, Chat, Call, Avatar Customize, Focus, Challenges, Routines, Weekly Summary, Progress Card)
- 33+ backend API endpoints all tested and passing
- 7 AI conversation modes
- Full CRUD for goals, routines, challenges
- Memory-aware AI responses

## Prioritized Remaining Backlog

### P1
- Notification/reminder system
- Mobile PWA optimization
- OpenAI Realtime Voice API (for higher quality voice calls)

### P2
- Pinecone vector DB for advanced long-term memory
- Export progress reports as PDF
- Social/community features
- Habit tracking with graphs
