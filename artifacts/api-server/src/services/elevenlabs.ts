import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";
import fs from "fs";
import path from "path";

const BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — clear, professional

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export async function generateVoice(
  text: string,
  outputPath: string,
  voiceId: string = DEFAULT_VOICE_ID,
): Promise<string> {
  const apiKey = secrets.get("ELEVENLABS_API_KEY");

  const settings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.85,
    style: 0.2,
    use_speaker_boost: true,
  };

  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${err}`);
  }

  const buffer = await response.arrayBuffer();
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  memoryStore.incApi("elevenlabs");
  logger.info({ outputPath }, "[ElevenLabs] Voice generated");
  return outputPath;
}

export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const apiKey = secrets.get("ELEVENLABS_API_KEY");
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) return [];
  const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
  return data.voices ?? [];
}
