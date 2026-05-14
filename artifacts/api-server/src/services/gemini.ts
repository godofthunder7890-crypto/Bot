import { GoogleGenerativeAI } from "@google/generative-ai";
import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";

let _ai: GoogleGenerativeAI | null = null;

function getAI(): GoogleGenerativeAI {
  if (!_ai) _ai = new GoogleGenerativeAI(secrets.get("GEMINI_API_KEY"));
  return _ai;
}

// All Gemini models in priority order — first working one wins
const GEMINI_MODELS = [
  "gemini-2.5-pro-preview-05-06",
  "gemini-2.0-pro-exp",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-pro",
];

// Wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Try each model in order (with 15s timeout each) until one succeeds
async function generateWithFallback(prompt: string): Promise<string> {
  const ai = getAI();
  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    try {
      logger.info({ modelName }, "[Gemini] Trying model...");
      const model = ai.getGenerativeModel({ model: modelName });
      const text = await withTimeout(
        model.generateContent(prompt).then((r) => r.response.text().trim()),
        15000,
        modelName
      );
      logger.info({ modelName }, "[Gemini] ✅ Success");
      memoryStore.incApi("gemini");
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.slice(0, 120) : String(err);
      logger.warn({ modelName, msg }, "[Gemini] ❌ Failed, trying next model...");
      errors.push(`${modelName}: ${msg}`);
    }
  }

  throw new Error(`All Gemini models failed:\n${errors.join("\n")}`);
}

export interface ReelScript {
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  keywords: string[];
  duration: number;
  hashtags: string[];
}

export async function generateReelScript(topic: string, niche: string): Promise<ReelScript> {
  const prompt = `You are a viral short-form video script writer. Create an engaging reel script for:
Topic: "${topic}"
Niche: "${niche}"

Return a JSON object with these exact fields:
{
  "hook": "First 3-5 seconds hook",
  "body": "Main content 15-25 seconds",
  "cta": "Call to action 3-5 seconds",
  "fullScript": "Complete script for voice-over",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "duration": 30,
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
Return ONLY the JSON, no markdown.`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  logger.info({ topic }, "[Gemini] Script generated");
  return JSON.parse(cleaned) as ReelScript;
}

export async function generateTrendingTopics(niche: string): Promise<string[]> {
  const prompt = `List 8 trending viral video topics for "${niche}" niche in 2025. Return ONLY a JSON array of strings. Example: ["topic1","topic2"]`;
  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as string[];
}

export async function generateCaption(script: ReelScript, platform: string = "Instagram"): Promise<string> {
  const prompt = `Write a viral ${platform} caption for this reel:
"${script.fullScript}"
Add emojis and these hashtags: ${script.hashtags.join(" ")}
Return only the caption text.`;
  return generateWithFallback(prompt);
}
