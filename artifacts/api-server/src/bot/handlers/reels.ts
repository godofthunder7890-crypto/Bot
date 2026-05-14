import { Context } from "telegraf";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { NICHE_KEYBOARD, TOPIC_SOURCE_KEYBOARD, REEL_CONFIRM_KEYBOARD, BACK_TO_MENU } from "../keyboards";
import { generateReelScript, generateTrendingTopics } from "../../services/gemini";
import { generateVoice } from "../../services/elevenlabs";
import { searchPexelsVideos } from "../../services/pexels";
import { searchPixabayVideos } from "../../services/pixabay";
import { renderReel, downloadAndPrepareClips, cleanupTmpFiles } from "../../render/ffmpeg";
import { uploadToFirebaseStorage } from "../../services/firebase";
import { saveReelToDb } from "../../services/supabase";
import { syncMemoryToGitHub } from "../../services/github";
import { memoryStore, ReelJob } from "../../storage/memory";
import { logger } from "../../lib/logger";

export const pendingTopicInput = new Map<number, { niche: string }>();
export const pendingRegenerateId = new Map<number, string>();

export async function startCreateReel(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    "🎬 *Create a New Reel*\n\nFirst, choose your content niche:",
    { parse_mode: "Markdown", reply_markup: NICHE_KEYBOARD },
  ).catch(() =>
    ctx.reply("🎬 *Create a New Reel*\n\nFirst, choose your content niche:", {
      parse_mode: "Markdown",
      reply_markup: NICHE_KEYBOARD,
    }),
  );
}

export async function handleNicheSelected(ctx: Context, niche: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  pendingTopicInput.set(userId, { niche });
  await ctx.editMessageText(
    `✅ Niche: *${niche}*\n\nHow do you want to pick the topic?`,
    { parse_mode: "Markdown", reply_markup: TOPIC_SOURCE_KEYBOARD },
  ).catch(() =>
    ctx.reply(`✅ Niche: *${niche}*\n\nHow do you want to pick the topic?`, {
      parse_mode: "Markdown",
      reply_markup: TOPIC_SOURCE_KEYBOARD,
    }),
  );
}

export async function handleAiTrendingTopics(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const pending = userId ? pendingTopicInput.get(userId) : null;
  const niche = pending?.niche ?? "general";

  await ctx.editMessageText("🔄 *Fetching trending topics with AI...*", {
    parse_mode: "Markdown",
  }).catch(() => ctx.reply("🔄 Fetching trending topics..."));

  try {
    const topics = await generateTrendingTopics(niche);
    const keyboard = {
      inline_keyboard: [
        ...topics.slice(0, 8).map((t, i) => [{ text: t, callback_data: `topic:select:${i}:${t.slice(0, 30)}` }]),
        [{ text: "🔙 Back", callback_data: "menu:create" }],
      ],
    };
    await ctx.editMessageText(
      `🔥 *Trending Topics for ${niche}:*\n\nPick one to generate your reel:`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    ).catch(() =>
      ctx.reply(`🔥 Trending Topics for ${niche}:`, { reply_markup: keyboard }),
    );
  } catch (e) {
    logger.error({ e }, "[Bot] Failed to fetch trending topics");
    await ctx.editMessageText("❌ Failed to fetch topics. Try again.", {
      reply_markup: BACK_TO_MENU,
    });
  }
}

export async function handleCustomTopicPrompt(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    "✍️ *Enter your topic*\n\nType the topic for your reel and send it as a message:",
    { parse_mode: "Markdown", reply_markup: BACK_TO_MENU },
  ).catch(() => ctx.reply("✍️ Type the topic for your reel:"));
}

export async function generateReelPipeline(
  ctx: Context,
  topic: string,
  niche: string,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const reelId = uuidv4();
  const job: ReelJob = {
    id: reelId,
    topic,
    niche,
    status: "generating",
    step: "script_generation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.addReel(job);
  memoryStore.setStep("reel_pipeline_started");

  const statusMsg = await ctx.reply(
    `🎬 *Generating Reel...*\n\n📝 Topic: *${topic}*\n🏷️ Niche: *${niche}*\n\n⏳ Step 1/5: Generating script with Gemini AI...`,
    { parse_mode: "Markdown" },
  );
  const msgId = statusMsg.message_id;

  const edit = (text: string) =>
    ctx.telegram.editMessageText(chatId, msgId, undefined, text, { parse_mode: "Markdown" }).catch(() => {});

  try {
    // Step 1: Script
    const script = await generateReelScript(topic, niche);
    memoryStore.updateReel(reelId, { step: "voice_generation", scriptText: script.fullScript });
    await edit(`🎬 *Generating Reel...*\n\n📝 *Script ready!*\n_"${script.hook}"_\n\n🎤 Step 2/5: Generating AI voice...`);

    // Step 2: Voice
    const voicePath = path.resolve(process.cwd(), "tmp", `voice_${reelId}.mp3`);
    await generateVoice(script.fullScript, voicePath);
    memoryStore.updateReel(reelId, { step: "fetching_clips", voiceUrl: voicePath });
    await edit(`🎬 *Generating Reel...*\n\n✅ Voice ready!\n\n🎥 Step 3/5: Fetching video clips...`);

    // Step 3: Video clips
    let clips = await searchPexelsVideos(script.keywords[0] ?? topic, 3);
    if (clips.length === 0) {
      const pbClips = await searchPixabayVideos(topic, 3);
      clips = pbClips.map((c) => ({ id: c.id, url: c.pageURL, width: 1080, height: 1920, duration: 30, downloadUrl: c.downloadUrl, source: "pixabay" as const }));
    }
    const localClips = await downloadAndPrepareClips(clips, reelId);
    memoryStore.updateReel(reelId, { step: "rendering", videoClips: localClips });
    await edit(`🎬 *Generating Reel...*\n\n✅ ${clips.length} clips ready!\n\n🎞️ Step 4/5: Rendering with FFmpeg...`);

    // Step 4: Render
    const outputPath = path.resolve(process.cwd(), "tmp", `reel_${reelId}.mp4`);
    let finalPath = outputPath;
    try {
      finalPath = await renderReel({ clips: localClips, audioPath: voicePath, outputPath, reelId });
    } catch (renderErr) {
      logger.warn({ renderErr }, "[Reel] Render failed, using audio only placeholder");
    }
    memoryStore.updateReel(reelId, { step: "uploading", outputPath: finalPath });
    await edit(`🎬 *Generating Reel...*\n\n✅ Reel rendered!\n\n☁️ Step 5/5: Uploading to Firebase...`);

    // Step 5: Upload to Firebase
    let firebaseUrl = "";
    try {
      const fileName = `reel_${reelId}.mp4`;
      firebaseUrl = await uploadToFirebaseStorage(finalPath, fileName);
    } catch (fbErr) {
      logger.warn({ fbErr }, "[Reel] Firebase upload failed");
      firebaseUrl = "upload_failed";
    }

    memoryStore.updateReel(reelId, { status: "done", step: "completed", firebaseUrl });
    await saveReelToDb({
      id: reelId, topic, niche, status: "done",
      script_text: script.fullScript,
      voice_url: voicePath,
      firebase_url: firebaseUrl,
    });

    cleanupTmpFiles(reelId);
    await syncMemoryToGitHub();

    // Send final preview
    await ctx.telegram.deleteMessage(chatId, msgId).catch(() => {});
    const previewText =
      `✅ *Reel Ready!*\n\n` +
      `📝 *Topic:* ${topic}\n` +
      `🏷️ *Niche:* ${niche}\n` +
      `⏱️ *Duration:* ~${script.duration}s\n\n` +
      `🎬 *Script Preview:*\n_${script.hook}_\n\n` +
      `📣 *Hashtags:*\n${script.hashtags.join(" ")}\n\n` +
      `☁️ *Firebase:* ${firebaseUrl !== "upload_failed" ? "✅ Uploaded" : "⚠️ Upload failed"}\n\n` +
      `_What do you want to do with this reel?_`;

    await ctx.reply(previewText, { parse_mode: "Markdown", reply_markup: REEL_CONFIRM_KEYBOARD });
    memoryStore.completeReel(reelId);
    memoryStore.setStep("reel_delivered");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, reelId }, "[Reel] Pipeline failed");
    memoryStore.failReel(reelId, msg);
    await edit(`❌ *Reel generation failed*\n\nError: ${msg}\n\nUse Settings → Clear Failed Jobs to retry.`);
    await ctx.reply("What would you like to do?", { reply_markup: BACK_TO_MENU });
  }
}
