import { createClient } from "@supabase/supabase-js";
import { secrets } from "../security/secretManager";
import { logger } from "../lib/logger";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) {
    _client = createClient(
      secrets.get("SUPABASE_URL"),
      secrets.get("SUPABASE_SERVICE_ROLE_KEY"),
    );
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
  logger.info("[Supabase] Note: Create 'reels' table manually in Supabase SQL Editor if not exists.");
  logger.info("[Supabase] SQL: CREATE TABLE IF NOT EXISTS reels (id TEXT PRIMARY KEY, topic TEXT, niche TEXT DEFAULT 'general', status TEXT DEFAULT 'pending', script_text TEXT, voice_url TEXT, video_url TEXT, firebase_url TEXT, telegram_message_id BIGINT, error TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());");
}
