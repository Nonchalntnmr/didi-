# Bhaiya AI - PRD

## Problem Statement
Build "Bhaiya AI" — a real-time, intelligent AI mentor platform for teens/young adults.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB)
- **Database**: MongoDB (11 collections)
- **AI Chat**: Claude Sonnet 4.5 via emergentintegrations (user's Anthropic key)
- **AI Voice**: OpenAI Realtime Voice via WebRTC (user's OpenAI key)
- **Auth**: Emergent Google OAuth
- **Languages**: 25 supported languages

## All Implemented Features (March 24, 2026)

### Pages (11 total)
1. Landing Page - Gradient hero, features, modes showcase, CTA
2. Dashboard - Hero card, Call Bhaiya spotlight, 9 action buttons, check-in, stats, goals
3. Chat - 7 AI modes selector, streaming animation, quick actions
4. Call Bhaiya - OpenAI Realtime Voice via WebRTC, waveform, mute controls
5. Avatar Customize - Appearance, personality sliders, voice, 25 languages
6. Focus Mode - Pomodoro timer (15/25/50/90 min), session history
7. Challenges - 3 daily from 20-pool, XP, streaks, difficulty badges
8. Routines - Study plans with steps, daily logging, 7-day calendar
9. Weekly Summary - AI-generated analysis with stats
10. Progress Card - Shareable stats card
11. Bhaiya Wrapped - Monthly AI progress report (4 slides, shareable)

### Core Systems
- 7 AI conversation modes (Educator, Coach, Wellness, Listener, General, Future You, Brutal Honesty)
- Memory-aware responses (15 messages + goals + check-ins)
- 25-language support
- OpenAI Realtime Voice (WebRTC)
- XP/streak gamification
- AI-generated summaries (weekly + monthly wrapped)

### Backend: 35+ API endpoints, all tested
