# Telegram AI Reel Automation System

An AI-powered system that automatically generates short-form vertical reels and sends them to Telegram for admin approval.

## Features

- **AI Script Generation** — Gemini 1.5 Flash generates viral scripts tailored to your topic
- **Auto Captions & Hashtags** — AI creates platform-ready captions with trending hashtags
- **AI Voiceover** — ElevenLabs (or Google TTS fallback) narrates the script
- **Stock Footage** — Pexels API fetches free portrait-orientation video clips
- **FFmpeg Rendering** — Assembles 9:16 vertical reels with subtitle overlays
- **Draft System** — Every reel goes to admin for approval before publishing
- **Scheduling** — Schedule approved reels for future posting
- **Analytics** — Track reel creation, approvals, and publishing stats
- **GitHub Sync** — Auto-pushes AGENT_MEMORY.md to keep project state current

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/telegram-ai-reel-automation
cd telegram-ai-reel-automation
npm install
cp .env.example .env
# Fill in your API keys in .env
node index.js
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and command list |
| `/newreel [topic]` | Generate a new AI reel on the given topic |
| `/approve [id]` | Approve a draft reel |
| `/delete [id]` | Delete a draft reel |
| `/schedule [id] [1h/24h]` | Schedule a reel for posting |
| `/stats` | View analytics dashboard |

## Workflow

```
Admin: /newreel "Morning motivation tips"
    ↓
Gemini AI generates 30-second script
    ↓
Caption + 15-20 hashtags generated
    ↓
AI voice narration created
    ↓
Pexels stock clips downloaded
    ↓
FFmpeg renders 1080x1920 reel with subtitles
    ↓
Draft sent to admin via Telegram
    ↓
Admin approves or deletes via inline buttons
    ↓
Approved reel published / scheduled
```

## Folder Structure

```
/bot          Telegram bot handlers and commands
/services     Core services (AI, voice, footage, analytics)
/render       FFmpeg pipeline
/templates    Video templates
/storage      Generated reels (gitignored)
/config       App config and Supabase client
/logs         Log files (gitignored)
/docs         Additional documentation
```

## Deployment

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for full deployment instructions.

Quick deploy to Railway:
1. Push to GitHub
2. Connect repo to Railway
3. Add environment variables
4. Railway auto-detects `railway.toml` and installs FFmpeg

## Tech Stack

- **Runtime**: Node.js 18+
- **Bot**: node-telegram-bot-api
- **AI**: Google Gemini 1.5 Flash
- **Voice**: ElevenLabs / Google TTS
- **Video**: FFmpeg (fluent-ffmpeg)
- **Stock**: Pexels API
- **Database**: Supabase (PostgreSQL)
- **Logging**: Winston
- **Server**: Express.js
- **Deploy**: Railway
