import { createClient } from "@supabase/supabase-js";
import { secrets } from "../security/secretManager";
import { logger } from "../lib/logger";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) {
    // Strip any accidental path suffixes from the URL (e.g. /rest/v1/)
    const rawUrl = secrets.get("SUPABASE_URL");
    const cleanUrl = rawUrl.replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, "").replace(/\/$/, "");
    _client = createClient(cleanUrl, secrets.get("SUPABASE_SERVICE_ROLE_KEY"));
  }
  return _client;
}

export interface DbReel {
  id: string;
  topic: string;
  niche: string;
  status: string;
  script_text?: string;
  voice_url?: string;
  video_url?: string;
  firebase_url?: string;
  telegram_message_id?: number;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

export async function saveReelToDb(reel: DbReel): Promise<void> {
  const db = getSupabase();
  const table = db.from("reels") as AnyTable;
  const { error } = await table.upsert({
    id: reel.id,
    topic: reel.topic,
    niche: reel.niche,
    status: reel.status,
    script_text: reel.script_text,
    voice_url: reel.voice_url,
    video_url: reel.video_url,
    firebase_url: reel.firebase_url,
    telegram_message_id: reel.telegram_message_id,
    error: reel.error,
    updated_at: new Date().toISOString(),
  });
  if (error) logger.error({ error }, "[Supabase] Failed to save reel");
}

export async function getReelById(id: string): Promise<DbReel | null> {
  const db = getSupabase();
  const table = db.from("reels") as AnyTable;
  const { data, error } = await table.select("*").eq("id", id).single();
  if (error) return null;
  return data as DbReel;
}

export async function getAllDrafts(): Promise<DbReel[]> {
  const db = getSupabase();
  const table = db.from("reels") as AnyTable;
  const { data, error } = await table
    .select("*")
    .in("status", ["done", "pending", "generating"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []) as DbReel[];
}

export async function getAnalytics(): Promise<Record<string, number>> {
  const db = getSupabase();
  const table = db.from("reels") as AnyTable;
  const { data, error } = await table.select("status");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as Array<{ status: string }>) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export async function initSupabaseTables(): Promise<void> {
  const db = getSupabase();

  // Try inserting a dummy row to check if table exists, then delete it
  // This avoids needing pg/exec_sql privileges
  const table = db.from("reels") as AnyTable;
  const { error: checkErr } = await table.select("id").limit(1);

  if (!checkErr) {
    logger.info("[Supabase] reels table already exists ✅");
    return;
  }

  // Table does not exist — log SQL for manual creation
  if (checkErr.code === "PGRST205" || checkErr.message?.includes("does not exist") || checkErr.message?.includes("schema cache")) {
    logger.warn("[Supabase] reels table not found — please run this SQL in Supabase SQL Editor:");
    logger.warn(`[Supabase] SQL:
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
CREATE INDEX IF NOT EXISTS reels_created_at_idx ON reels(created_at DESC);`);
  } else {
    logger.error({ err: checkErr }, "[Supabase] Unexpected error checking reels table");
  }
}
