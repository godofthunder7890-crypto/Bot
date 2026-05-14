# 🤖 AGENT HANDOFF — Telegram AI Reel Automation System

> **For the next AI Agent:** Read this file first. Everything you need to continue work is here.
> No need to ask for API keys — they are all in environment secrets/variables.
> Start exactly where the previous agent left off.

---

## 📍 WHERE TO PICK UP

Check `AGENT_MEMORY.json` → field `lastExecutedStep` tells you exactly where execution stopped.
Check `AGENT_MEMORY.md` for a human-readable summary of system state.

---

## 🗂️ PROJECT STRUCTURE

```
/                          ← Repo root
├── artifacts/
│   └── api-server/        ← Main backend (Express + Telegraf bot)
│       └── src/
│           ├── security/
│           │   └── secretManager.ts    ← Loads & validates ALL secrets
│           ├── bot/
│           │   ├── index.ts            ← Bot startup + callback router
│           │   ├── keyboards.ts        ← All inline keyboard layouts
│           │   └── handlers/
│           │       ├── menu.ts         ← Main menu & status
│           │       ├── reels.ts        ← Full reel generation pipeline
│           │       ├── drafts.ts       ← Draft list & management
│           │       ├── analytics.ts    ← Analytics dashboard
│           │       ├── promotion.ts    ← Platform promotion tools
│           │       └── settings.ts     ← Settings & GitHub sync
│           ├── services/
│           │   ├── gemini.ts           ← Gemini AI (script generation)
│           │   ├── elevenlabs.ts       ← ElevenLabs (voice generation)
│           │   ├── pexels.ts           ← Pexels stock videos
│           │   ├── pixabay.ts          ← Pixabay backup videos
│           │   ├── firebase.ts         ← Firebase Storage upload
│           │   ├── supabase.ts         ← Supabase DB (reels table)
│           │   └── github.ts           ← GitHub auto-push
│           ├── render/
│           │   └── ffmpeg.ts           ← FFmpeg video rendering
│           ├── storage/
│           │   └── memory.ts           ← Agent memory (JSON + MD)
│           └── utils/
│               └── helpers.ts          ← Utility functions
├── AGENT_MEMORY.json      ← Machine-readable system state (AUTO-UPDATED)
├── AGENT_MEMORY.md        ← Human-readable memory (AUTO-UPDATED)
├── AGENT_HANDOFF.md       ← This file
├── railway.json           ← Railway deployment config
├── Procfile               ← Process config for Railway
├── .env.example           ← Template for required env vars
└── .gitignore             ← .env and secrets excluded
```

---

## 🔑 REQUIRED SECRETS (All stored in Replit Secrets / Railway Env Vars)

> ⚠️ NEVER hardcode these. Use `process.env.KEY` or `secrets.get("KEY")`.

| Secret Key | What It Does | Where to Get |
|-----------|-------------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot auth | BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | Admin user ID | Your Telegram profile |
| `GEMINI_API_KEY` | Google Gemini AI (scripts) | aistudio.google.com |
| `ELEVENLABS_API_KEY` | AI voice generation | elevenlabs.io |
| `PEXELS_API_KEY` | Stock video clips | pexels.com/api |
| `PIXABAY_API_KEY` | Backup stock videos | pixabay.com/api |
| `FIREBASE_API_KEY` | Firebase Storage | Firebase Console |
| `SUPABASE_URL` | Database connection | Supabase project settings |
| `SUPABASE_ANON_KEY` | Supabase public key | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | Supabase project settings |
| `GITHUB_TOKEN` | Auto-push commits | GitHub → Settings → Developer |
| `GITHUB_REPO` | Target repo (user/repo) | Your GitHub repo |
| `RAILWAY_TOKEN` | Railway deployment | Railway dashboard |

**Non-secret env vars (can be plain env):**
- `FIREBASE_PROJECT_ID` = `intro-7444d`
- `FIREBASE_STORAGE_BUCKET` = `intro-7444d.firebasestorage.app`
- `NODE_ENV` = `production`
- `PORT` = `8080` (auto-assigned in Railway)

---

## 🚀 HOW TO RUN

### Development (Replit)
```bash
pnpm --filter @workspace/api-server run dev
```

### Production (Railway)
- Connect GitHub repo to Railway
- Set all secrets as Railway environment variables
- Railway auto-deploys on push to main
- Uses `railway.json` for build/start config
- Health check: `GET /api/healthz`

---

## 🤖 AI PIPELINE FLOW

```
User taps button in Telegram
    ↓
Bot handler (bot/index.ts)
    ↓
generateReelPipeline() in handlers/reels.ts
    ↓
Step 1: gemini.ts → generateReelScript(topic, niche)
    ↓
Step 2: elevenlabs.ts → generateVoice(script, outputPath)
    ↓
Step 3: pexels.ts → searchPexelsVideos(keywords)
         pixabay.ts (fallback if Pexels fails)
    ↓
Step 4: ffmpeg.ts → renderReel(clips, audio, output)
    ↓
Step 5: firebase.ts → uploadToFirebaseStorage(file)
    ↓
Step 6: supabase.ts → saveReelToDb(reel)
    ↓
Step 7: github.ts → syncMemoryToGitHub()
    ↓
Bot sends preview to Telegram with approve/reject buttons
```

---

## 🗄️ DATABASE (Supabase)

Table: `reels`
```sql
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  niche TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',   -- pending | generating | rendering | done | failed
  script_text TEXT,
  voice_url TEXT,
  video_url TEXT,
  firebase_url TEXT,
  telegram_message_id BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

If the table doesn't exist, run the SQL above in Supabase SQL Editor.

---

## ☁️ FIREBASE

- Project ID: `intro-7444d`
- Storage Bucket: `intro-7444d.firebasestorage.app`
- Files stored at: `gs://intro-7444d.firebasestorage.app/reels/`
- Service: REST API (no Firebase Admin SDK needed)

---

## 🐙 GITHUB AUTO-SYNC

Triggered automatically after:
1. Every completed reel
2. Manual "GitHub Sync Now" in Settings
3. Reel approval by admin

Files pushed on each sync:
- `AGENT_MEMORY.json` — current system state
- `AGENT_MEMORY.md` — human-readable state
- `SYSTEM_STATE.md` — brief deployment summary

---

## 🚂 RAILWAY DEPLOYMENT

1. Go to railway.app → New Project → Deploy from GitHub
2. Select this repo
3. Add all secrets from the table above as environment variables
4. Railway will auto-build and deploy
5. The bot starts on launch and sends a startup message to your Telegram

---

## 📱 TELEGRAM BOT UI

**No slash commands** — fully inline button based.

Main Menu buttons:
- `➕ Create Reel` → Choose niche → Pick/type topic → Auto-generates full reel
- `📂 Drafts` → View all saved reels from Supabase
- `📊 Analytics` → API usage, reel counts, GitHub status
- `📣 Promotion` → Generate captions for Instagram/TikTok/YouTube
- `⚙️ Settings` → GitHub sync, API status, clear failed jobs
- `🔄 Refresh Status` → Live system stats

---

## 🐛 COMMON ISSUES & FIXES

| Problem | Fix |
|---------|-----|
| Bot not responding | Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are correct |
| Gemini error | Verify GEMINI_API_KEY at aistudio.google.com |
| ElevenLabs fails | Check API quota at elevenlabs.io |
| Firebase upload fails | Ensure FIREBASE_API_KEY matches project `intro-7444d` |
| Supabase error | Run the CREATE TABLE SQL in Supabase dashboard |
| GitHub push fails | GITHUB_TOKEN needs `repo` scope, GITHUB_REPO format: `user/repo` |
| FFmpeg not found | System ffmpeg not installed — bot will create placeholder and continue |
| Build fails | Run `pnpm --filter @workspace/api-server run typecheck` to see errors |

---

## 🔄 NEXT STEPS TO IMPLEMENT

- [ ] Add FFmpeg subtitle overlay (captions on video)
- [ ] Add scheduled posting (cron job for auto-posting)
- [ ] Add Instagram/TikTok direct upload via API
- [ ] Add voice selection UI (multiple ElevenLabs voices)
- [ ] Add reel thumbnail generation (Firebase Storage)
- [ ] Add usage cost tracking per API call
- [ ] Add A/B script testing (generate 2 scripts, pick best)
- [ ] Add Supabase real-time notifications

---

## 📝 KEY COMMANDS

```bash
# Run in dev
pnpm --filter @workspace/api-server run dev

# Type check
pnpm --filter @workspace/api-server run typecheck

# Build
pnpm --filter @workspace/api-server run build

# Full workspace typecheck
pnpm run typecheck
```

---

*Last updated by agent on: 2026-05-14*
*System version: 2.0.0*
*If you are a new agent reading this — you have everything you need. Start the bot and begin.*
