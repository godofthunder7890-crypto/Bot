# 🤖 NEXT AGENT — Copy-Paste Prompt

> Is file ko copy karke next agent ko do. Woh bilkul wahi se shuru karega jahan pichla agent ruka.

---

## ✅ EXACT PROMPT (Copy karo aur next agent ko do):

---

```
Tu ek senior AI automation engineer hai. Mujhe ek already-built Telegram AI Reel 
Automation System continue karna hai jo GitHub pe hai.

## GitHub Repo
https://github.com/godofthunder7890-crypto/Bot

## Sabse Pehle Yeh 3 Files Padho
1. AGENT_HANDOFF.md  — poora system architecture + pending tasks
2. AGENT_MEMORY.json — lastExecutedStep field dekho (wahan se shuru karo)
3. NEXT_AGENT_PROMPT.md — ye file, current status ke liye

## System Kya Hai
Telegram bot "Tems1_bot" jo:
- Inline buttons se kaam karta hai (koi slash commands nahi)
- Gemini AI se viral video scripts banata hai
- ElevenLabs se voice generate karta hai  
- Pexels/Pixabay se stock video clips laata hai
- FFmpeg se reel render karta hai
- Firebase Storage pe upload karta hai
- Supabase DB mein save karta hai
- GitHub pe auto-push karta hai
- Railway pe 24/7 deploy hona hai

## Stack
Node.js 24 + TypeScript + Express 5 + Telegraf 4 + pnpm workspaces + esbuild

## CRITICAL Build Rule
telegraf aur node-fetch MUST be in esbuild external list (build.mjs)
Agar bundled ho jayein — Node 24 AbortSignal conflict se bot crash ho jaata hai

## Bot Startup Fix
Bot ALWAYS deleteWebhook() karta hai launch se pehle (409 Conflict fix)
Retry logic hai — 3 attempts, 5s delay each

## Secrets (Already set hain — dobara mat maango)
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GEMINI_API_KEY, ELEVENLABS_API_KEY,
PEXELS_API_KEY, PIXABAY_API_KEY, FIREBASE_API_KEY, SUPABASE_URL,
SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN,
GITHUB_REPO=godofthunder7890-crypto/Bot, RAILWAY_TOKEN,
FIREBASE_PROJECT_ID=intro-7444d, FIREBASE_STORAGE_BUCKET=intro-7444d.firebasestorage.app

## Supabase Info
- Project: "SMM PENEL"
- Ref: jkuvjhbivggtztxvcums
- URL: https://jkuvjhbivggtztxvcums.supabase.co
- Region: ap-south-1
- Status: ACTIVE_HEALTHY
- Table "reels" — create karo agar nahi hai (SQL neeche hai)

## Railway Info
- Account: godofthunder7890@gmail.com
- Workspace ID: 44a8fe3d-abaa-4766-a8d3-80bbbb84b559
- Abhi koi project nahi bana (pending hai)
- GitHub repo se deploy karna hai: godofthunder7890-crypto/Bot

## Pending Tasks (Priority Order)
1. Supabase "reels" table create karo (SQL neeche hai)
2. Railway project create karo + GitHub se link karo + env vars set karo
3. Jo bhi user ne naya kaam bataya ho

## How to Run (Development)
pnpm --filter @workspace/api-server run dev

## File Structure
artifacts/api-server/src/
├── index.ts              — entry point
├── security/secretManager.ts
├── bot/index.ts          — bot start + polling
├── bot/keyboards.ts      — inline keyboards
├── bot/handlers/         — menu, reels, drafts, analytics, promotion, settings
├── services/             — gemini, elevenlabs, pexels, pixabay, firebase, supabase, github
├── render/ffmpeg.ts
└── storage/memory.ts     — AGENT_MEMORY.json read/write
```

---

## 📋 Supabase SQL (Supabase Dashboard → SQL Editor mein run karo)

```sql
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  niche TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  script_text TEXT,
  voice_url TEXT,
  video_url TEXT,
  firebase_url TEXT,
  telegram_message_id BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reels_status_idx ON reels(status);
CREATE INDEX IF NOT EXISTS reels_created_at_idx ON reels(created_at DESC);
```

---

## 🚂 Railway Setup (Manual — Dashboard pe karo)

**URL:** https://railway.app

1. Login → **New Project** → **Deploy from GitHub repo**
2. `godofthunder7890-crypto/Bot` select karo
3. **Variables** tab mein yeh sab add karo:

```
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<apne secrets se>
TELEGRAM_CHAT_ID=<apne secrets se>
GEMINI_API_KEY=<apne secrets se>
ELEVENLABS_API_KEY=<apne secrets se>
PEXELS_API_KEY=<apne secrets se>
PIXABAY_API_KEY=<apne secrets se>
FIREBASE_API_KEY=<apne secrets se>
FIREBASE_PROJECT_ID=intro-7444d
FIREBASE_STORAGE_BUCKET=intro-7444d.firebasestorage.app
SUPABASE_URL=https://jkuvjhbivggtztxvcums.supabase.co
SUPABASE_ANON_KEY=<apne secrets se>
SUPABASE_SERVICE_ROLE_KEY=<apne secrets se>
GITHUB_TOKEN=<apne secrets se>
GITHUB_REPO=godofthunder7890-crypto/Bot
RAILWAY_TOKEN=<apne secrets se>
PORT=8080
```

4. **Settings** → Start Command:
```
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

5. Deploy → Bot start hote hi Telegram pe message aayega ✅

---

## 🔄 System State At This Handoff

| Component | Status |
|-----------|--------|
| Bot (Tems1_bot) | ✅ RUNNING locally |
| GitHub push | ✅ 24+ files pushed |
| Supabase connection | ✅ Keys working, table pending |
| Railway project | ⏳ Pending (workspace ID known) |
| Build | ✅ Clean (2.4mb bundle) |
| TypeCheck | ✅ 0 errors |

---

*Generated: 2026-05-14 | Repo: godofthunder7890-crypto/Bot*
