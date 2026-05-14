import { GoogleGenerativeAI } from "@google/generative-ai";
import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";

let _ai: GoogleGenerativeAI | null = null;

function getAI(): GoogleGenerativeAI {
  if (!_ai) _ai = new GoogleGenerativeAI(secrets.get("GEMINI_API_KEY"));
  return _ai;
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
  const model = getAI().getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `You are a viral short-form video script writer. Create an engaging reel script for:
Topic: "${topic}"
Niche: "${niche}"

Return a JSON object with these exact fields:
{
  "hook": "First 3-5 seconds hook (attention-grabbing opener)",
  "body": "Main content (15-25 seconds worth of speech)",
  "cta": "Call to action (last 3-5 seconds)",
  "fullScript": "Complete script text for voice-over",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "duration": 30,
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}

Rules:
- Hook must stop the scroll
- Body must deliver real value
- CTA must drive engagement
- Keep total under 60 seconds
- Make it VIRAL worthy
Return ONLY the JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  memoryStore.incApi("gemini");
  logger.info({ topic }, "[Gemini] Script generated");

  return JSON.parse(cleaned) as ReelScript;
}

export async function generateTrendingTopics(niche: string): Promise<string[]> {
  const model = getAI().getGenerativeModel({ model: "gemini-1.5-pro" });
  const prompt = `List 10 trending viral video topics for the "${niche}" niche right now in 2025. Return as JSON array of strings only. No explanation.`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  memoryStore.incApi("gemini");
  return JSON.parse(text) as string[];
}

export async function generateCaption(script: ReelScript, platform: string = "Instagram"): Promise<string> {
  const model = getAI().getGenerativeModel({ model: "gemini-1.5-pro" });
  const prompt = `Write a viral ${platform} caption for this reel script:
"${script.fullScript}"
Include hook, value, and CTA. Add emojis. End with these hashtags: ${script.hashtags.join(" ")}
Return only the caption text.`;
  const result = await model.generateContent(prompt);
  memoryStore.incApi("gemini");
  return result.response.text().trim();
}
