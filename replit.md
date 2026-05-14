# Telegram AI Reel Automation System

A production-grade Telegram bot that auto-generates viral reels using AI — fully inline button UI, no slash commands.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Telegram bot (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: See `.env.example` for all 13 required secrets

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Bot: Telegraf 4 (Telegram Bot framework — inline keyboard UI)
- AI: Google Gemini 1.5 Flash (script generation)
- Voice: ElevenLabs (AI voice synthesis)
- Video: Pexels + Pixabay (stock clips) + FFmpeg (rendering)
- Storage: Firebase Storage (video hosting), Supabase (database)
- GitHub: @octokit/rest (auto-push after every reel)
- Deployment: Railway (24/7 production hosting)
- Build: esbuild (ESM bundle) — telegraf & node-fetch externalized

## Where things live

- DB schema: Supabase `reels` table (see AGENT_HANDOFF.md for SQL)
- API contracts: `lib/api-spec/openapi.yaml`
- Bot entry: `artifacts/api-server/src/bot/index.ts`
- Secret manager: `artifacts/api-server/src/security/secretManager.ts`
- Agent memory: `AGENT_MEMORY.json` + `AGENT_MEMORY.md` (auto-updated)
- Agent handoff: `AGENT_HANDOFF.md` (full guide for next agent)

## Architecture decisions

- All secrets via `process.env` only — SecretManager validates all 13 at startup
- Telegraf externalized from esbuild bundle to avoid node-fetch AbortSignal conflict with Node 24
- Bot polling with deleteWebhook + retry logic to handle 409 conflicts on restart
- Memory persists to `AGENT_MEMORY.json` so bot resumes exactly where it stopped
- GitHub auto-push via REST API after every completed reel

## Product

- Telegram admin sends message → Bot shows inline menu
- Create Reel: Gemini generates script → ElevenLabs voice → Pexels/Pixabay clips → FFmpeg renders → Firebase uploads → Telegram preview
- Drafts: View/approve/delete reels from Supabase
- Analytics: API usage, reel counts, GitHub status
- Promotion: Generate platform-specific captions (Instagram/TikTok/YouTube/Twitter)
- Settings: GitHub sync, API status check, clear failed jobs

## User preferences

- No hardcoded API keys anywhere
- No slash commands — inline buttons only
- 24/7 on Railway (not Replit hosting)
- Firebase project: intro-7444d
- GitHub repo: godofthunder7890-crypto/Bot
- All memory in AGENT_MEMORY.json for resumable state

## Gotchas

- `telegraf` and `node-fetch` must be in esbuild `external` list — otherwise AbortSignal conflict with Node 24
- Bot always calls `deleteWebhook` before launch to clear 409 Conflict errors
- Supabase `reels` table must be created manually (SQL in AGENT_HANDOFF.md)
- FIREBASE_SERVICE_ACCOUNT_JSON not required — uses REST API with FIREBASE_API_KEY instead

## Pointers

- See `AGENT_HANDOFF.md` for complete next-agent guide
- See `AGENT_MEMORY.json` for current system state
- See `.env.example` for all required environment variables
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
