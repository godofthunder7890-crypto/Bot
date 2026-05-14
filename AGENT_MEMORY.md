# AGENT_MEMORY.md
*Last Updated: 2026-05-14*

## Current Project Status
Complete v1.0 — All modules built and tested. Awaiting API key configuration to go live.

## Project Overview
Telegram AI Reel Automation System — generates AI-powered short-form videos
and sends them to Telegram admin for approval. Built with Node.js, Gemini AI,
FFmpeg, Supabase, and Railway.

## Completed Features
- Telegram bot with full command set (/start, /newreel, /approve, /delete, /schedule, /stats)
- Gemini AI script generation (30-second viral scripts)
- AI caption and hashtag generation
- AI voice generation (ElevenLabs + Google TTS fallback)
- Pexels stock footage fetching (portrait orientation)
- FFmpeg 9:16 vertical reel rendering with subtitle overlays
- Draft approval system via Telegram inline keyboard
- Reel scheduling with cron jobs (checks every minute)
- Supabase database (reels, schedules, analytics, bot_logs tables)
- Winston logging (file + Supabase persistence)
- GitHub AGENT_MEMORY auto-push integration
- Express.js health check server (/health, /stats endpoints)
- Railway deployment configuration (railway.toml with FFmpeg)

## Pending Tasks
- Add TELEGRAM_BOT_TOKEN to .env
- Add TELEGRAM_ADMIN_CHAT_ID to .env
- Add GEMINI_API_KEY to .env
- Add SUPABASE credentials to .env
- Optional: Add PEXELS_API_KEY for stock footage
- Optional: Add ELEVENLABS_API_KEY for premium voice
- Optional: Add GITHUB_TOKEN for auto-push
- Deploy to Railway

## APIs Used
| API | Purpose | Required |
|-----|---------|----------|
| Telegram Bot API | Bot control, messaging | YES |
| Google Gemini 1.5 Flash | Script/caption generation | YES |
| Supabase | Database, storage | YES |
| Pexels | Free stock footage | Recommended |
| ElevenLabs | AI voice generation | Optional |
| GitHub | Code repository, auto-push | Optional |

## Deployment Status
- Platform: Railway (railway.toml configured)
- Node version: 18+
- FFmpeg: Installed via nixpacks aptPkgs in railway.toml
- Environment: All secrets in .env / Railway env vars

## Current Bugs
- None known

## Folder Explanations
```
/bot          - Telegram bot handlers, commands, keyboards, messages
/services     - Core services: AI, voice, stock footage, analytics, logger, scheduler, GitHub
/render       - FFmpeg rendering pipeline and video processing utilities
/templates    - Subtitle and video templates (expandable)
/storage      - Generated reels and temp files (gitignored)
/config       - App config loader, Supabase client singleton
/logs         - Winston log files (gitignored)
/docs         - SETUP_GUIDE.md, PROJECT_STATUS.md, ROADMAP.md
```

## Key Files
- `index.js` — Main entry point, starts bot + server + scheduler
- `bot/commands.js` — All Telegram command handlers
- `render/pipeline.js` — Full reel generation pipeline (AI → Voice → Clips → FFmpeg)
- `render/ffmpeg.js` — FFmpeg video rendering utilities
- `services/gemini.js` — Gemini AI script/caption/subtitle generation
- `services/voice.js` — Voice generation (ElevenLabs + TTS fallback)
- `services/stockFootage.js` — Pexels clip fetching and downloading
- `services/reelStore.js` — Supabase CRUD for reels and schedules
- `services/scheduler.js` — Cron-based scheduled posting

## How to Continue This Project
1. Clone: `git clone https://github.com/YOUR_USERNAME/telegram-ai-reel-automation`
2. Install: `npm install`
3. Copy `.env.example` to `.env` and fill in all API keys
4. Run: `node index.js`
5. Reference SETUP_GUIDE.md for detailed instructions

## Future Roadmap
See ROADMAP.md for full planned features.
- v1.1: Background music, templates, AI thumbnails
- v1.2: Multi-platform posting, web dashboard
- v2.0: Custom voice training, analytics UI

## Architecture Notes
- The reel pipeline runs asynchronously — bot sends "processing" message immediately
  and notifies when done (1-3 minutes depending on FFmpeg + API speed)
- All file paths use absolute `path.resolve()` for cross-platform compatibility
- Service role key used for Supabase to bypass RLS on server side
- Voice generation degrades gracefully: ElevenLabs → Google TTS → no audio
- Stock footage degrades gracefully: Pexels clips → solid color background
