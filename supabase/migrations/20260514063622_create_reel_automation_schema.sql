/*
  # Telegram AI Reel Automation - Database Schema

  ## Overview
  Complete schema for the AI-powered reel automation system including reels,
  drafts, schedules, logs, and analytics.

  ## New Tables

  ### 1. `reels`
  - `id` (uuid, primary key) - Unique reel identifier
  - `topic` (text) - Topic submitted by admin
  - `script` (text) - AI-generated script
  - `caption` (text) - AI-generated caption
  - `hashtags` (text[]) - Generated hashtags
  - `voice_url` (text) - URL to generated audio file
  - `video_url` (text) - URL to rendered video
  - `thumbnail_url` (text) - Thumbnail image URL
  - `status` (text) - Current status: pending, processing, draft, approved, scheduled, published, deleted
  - `created_by_chat_id` (text) - Telegram chat ID of requester
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `duration_seconds` (integer) - Video duration
  - `render_job_id` (text) - Reference to render job
  - `error_message` (text) - Error if processing failed

  ### 2. `schedules`
  - `id` (uuid, primary key)
  - `reel_id` (uuid, FK to reels) - Associated reel
  - `scheduled_at` (timestamptz) - When to publish
  - `platform` (text) - Target platform (telegram, etc.)
  - `status` (text) - pending, sent, failed
  - `created_at` (timestamptz)

  ### 3. `analytics`
  - `id` (uuid, primary key)
  - `reel_id` (uuid, FK to reels)
  - `event_type` (text) - created, approved, deleted, scheduled, published, viewed
  - `event_data` (jsonb) - Additional event metadata
  - `chat_id` (text) - Telegram chat ID that triggered the event
  - `created_at` (timestamptz)

  ### 4. `bot_logs`
  - `id` (uuid, primary key)
  - `level` (text) - info, warn, error
  - `message` (text) - Log message
  - `context` (jsonb) - Additional context
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Service role has full access (used by backend)
  - No public access by default
*/

-- Reels table
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  script text DEFAULT '',
  caption text DEFAULT '',
  hashtags text[] DEFAULT '{}',
  voice_url text DEFAULT '',
  video_url text DEFAULT '',
  thumbnail_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_by_chat_id text NOT NULL,
  duration_seconds integer DEFAULT 30,
  render_job_id text DEFAULT '',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  platform text NOT NULL DEFAULT 'telegram',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid REFERENCES reels(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  chat_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Bot logs table
CREATE TABLE IF NOT EXISTS bot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (backend uses service role key)
CREATE POLICY "Service role full access to reels"
  ON reels FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert reels"
  ON reels FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update reels"
  ON reels FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role delete reels"
  ON reels FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to schedules"
  ON schedules FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert schedules"
  ON schedules FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update schedules"
  ON schedules FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role delete schedules"
  ON schedules FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to analytics"
  ON analytics FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert analytics"
  ON analytics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role full access to bot_logs"
  ON bot_logs FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert bot_logs"
  ON bot_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels(status);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_chat_id ON reels(created_by_chat_id);
CREATE INDEX IF NOT EXISTS idx_schedules_reel_id ON schedules(reel_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_analytics_reel_id ON analytics(reel_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_level ON bot_logs(level);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at ON bot_logs(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reels_updated_at
  BEFORE UPDATE ON reels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
