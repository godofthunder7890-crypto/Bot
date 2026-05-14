# Setup Guide

## Prerequisites

- Node.js 18 or higher
- FFmpeg installed on your system
- Telegram account
- Google account (for Gemini API)

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name (e.g., "My Reel Bot")
4. Choose a username ending in `bot` (e.g., "myreelbot")
5. Copy the **bot token** — save it for `.env`

To get your admin Chat ID:
1. Message `@userinfobot` on Telegram
2. Copy your **ID number**

---

## Step 2: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it for `.env`

---

## Step 3: Get Pexels API Key (Free)

1. Go to [Pexels API](https://www.pexels.com/api/)
2. Sign up / log in
3. Create an application
4. Copy your API key

---

## Step 4: Get ElevenLabs API Key (Optional)

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up for free tier (10,000 chars/month free)
3. Go to Profile → API Keys
4. Copy your API key

---

## Step 5: Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
4. The database schema is applied automatically on first run

---

## Step 6: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PEXELS_API_KEY=your_pexels_key
ELEVENLABS_API_KEY=your_elevenlabs_key  # optional
```

---

## Step 7: Install and Run

```bash
npm install
node index.js
```

---

## Step 8: Deploy to Railway

1. Push code to a private GitHub repository
2. Go to [railway.app](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. In Railway settings, add all environment variables from your `.env`
6. Railway will detect `railway.toml` and install FFmpeg automatically
7. Your bot goes live!

---

## Mobile-Friendly (StackBlitz/Replit)

### StackBlitz
- Upload project files
- Open terminal: `npm install && node index.js`
- Note: FFmpeg may have limited support on StackBlitz

### Replit
- Import from GitHub or create new Node.js repl
- Add secrets via the Secrets panel (equivalent to .env)
- Replit supports FFmpeg via system packages
- Add to `replit.nix`: `pkgs.ffmpeg`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Bot not responding | Check `TELEGRAM_BOT_TOKEN` is correct |
| Script not generating | Verify `GEMINI_API_KEY` is valid |
| No video output | Ensure FFmpeg is installed: `ffmpeg -version` |
| No stock clips | Check `PEXELS_API_KEY` |
| Database errors | Verify Supabase credentials and RLS policies |
