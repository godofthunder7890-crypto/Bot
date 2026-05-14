# AGENT_MEMORY.md
*Last Updated: 2026-05-14T18:22:20.952Z*

## Current Project Status
Running

## Project Overview
Telegram AI Reel Automation System — generates AI-powered short-form videos
and sends them to Telegram admin for approval.

## Completed Features
- Telegram bot with full command set (/start, /newreel, /approve, /delete, /schedule, /stats)
- Gemini AI script and caption generation
- AI voice generation (ElevenLabs + Google TTS fallback)
- Pexels stock footage fetching
- FFmpeg 9:16 vertical reel rendering with subtitles
- Draft approval system via inline keyboard
- Reel scheduling with cron jobs
- Supabase database (reels, schedules, analytics, logs)
- Winston logging (file + Supabase persistence)
- GitHub auto-push integration
- Express.js health check server
- Railway deployment configuration

## Pending Tasks
- Connect real Telegram bot token
- Configure Gemini API key
- Set Pexels API key for stock footage
- Optional: ElevenLabs for premium voice
- Deploy to Railway

## APIs Used
| API | Purpose | Required |
|-----|---------|----------|
| Telegram Bot API | Bot control, messaging | YES |
| Google Gemini | Script/caption generation | YES |
| Supabase | Database, storage | YES |
| Pexels | Free stock footage | Recommended |
| ElevenLabs | AI voice generation | Optional |
| GitHub | Code repository, auto-push | Optional |

## Deployment Status
- Platform: Railway (railway.toml configured)
- Node version: 18+
- Environment: All secrets in .env / Railway env vars

## Current Bugs
- None known

## Folder Explanations
```
/bot          - Telegram bot handlers, commands, keyboards, messages
/services     - Core services: AI, voice, stock footage, analytics, logger
/render       - FFmpeg rendering pipeline and utilities
/templates    - Subtitle and video templates
/storage      - Generated reels and temp files (gitignored)
/config       - App config, Supabase client
/logs         - Log files (gitignored)
/docs         - Documentation files
```

## How to Continue This Project
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in API keys
4. Run `node index.js`
5. Reference SETUP_GUIDE.md for full instructions

## Future Roadmap
- Multi-platform posting (Instagram, TikTok)
- Background music library
- Template system for different reel styles
- AI thumbnail generation
- Analytics dashboard web UI
- Batch reel generation
- Custom voice training
