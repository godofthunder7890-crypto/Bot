import { Context } from "telegraf";
import { getAllDrafts } from "../../services/supabase";
import { memoryStore } from "../../storage/memory";
import { draftsKeyboard, draftActionsKeyboard, BACK_TO_MENU } from "../keyboards";
import { syncMemoryToGitHub } from "../../services/github";
import { logger } from "../../lib/logger";

export async function showDrafts(ctx: Context): Promise<void> {
  try {
    const drafts = await getAllDrafts();
    const pending = memoryStore.get().pendingReels;

    const allDrafts = [
      ...pending.map((r) => ({ id: r.id, topic: r.topic, status: r.status })),
      ...drafts.map((d) => ({ id: d.id, topic: d.topic, status: d.status })),
    ];

    const unique = allDrafts.filter(
      (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i,
    );

    if (unique.length === 0) {
      await ctx.editMessageText(
        "📂 *Drafts*\n\nNo drafts yet. Create your first reel!",
        { parse_mode: "Markdown", reply_markup: BACK_TO_MENU },
      ).catch(() => ctx.reply("No drafts yet.", { reply_markup: BACK_TO_MENU }));
      return;
    }

    await ctx.editMessageText(
      `📂 *Drafts* (${unique.length} reels)\n\nSelect a draft to view details:`,
      { parse_mode: "Markdown", reply_markup: draftsKeyboard(unique) },
    ).catch(() =>
      ctx.reply(`📂 Drafts (${unique.length})`, { reply_markup: draftsKeyboard(unique) }),
    );
  } catch (e) {
    logger.error({ e }, "[Drafts] Failed to load");
    await ctx.editMessageText("❌ Failed to load drafts.", {
      reply_markup: BACK_TO_MENU,
    }).catch(() => {});
  }
}

export async function showDraftDetail(ctx: Context, id: string): Promise<void> {
  const mem = memoryStore.get();
  const localJob = mem.pendingReels.find((r) => r.id === id) ?? mem.failedJobs.find((r) => r.id === id);

  let topic = localJob?.topic ?? "Unknown";
  let status = localJob?.status ?? "unknown";
  let script = localJob?.scriptText ?? "";
  let firebaseUrl = localJob?.firebaseUrl ?? "";
  let step = localJob?.step ?? "";

  if (!localJob) {
    const { getReelById } = await import("../../services/supabase");
    const dbReel = await getReelById(id);
    if (dbReel) {
      topic = dbReel.topic;
      status = dbReel.status;
      script = dbReel.script_text ?? "";
      firebaseUrl = dbReel.firebase_url ?? "";
    }
  }

  const text =
    `📄 *Reel Detail*\n\n` +
    `📝 *Topic:* ${topic}\n` +
    `📊 *Status:* ${status}\n` +
    `🔢 *ID:* \`${id.slice(0, 8)}...\`\n` +
    (step ? `⚙️ *Step:* ${step}\n` : "") +
    (script ? `\n🎬 *Script Preview:*\n_${script.slice(0, 200)}${script.length > 200 ? "..." : ""}_\n` : "") +
    (firebaseUrl && firebaseUrl !== "upload_failed" ? `\n☁️ *Firebase:* ✅ Uploaded\n` : "");

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: draftActionsKeyboard(id),
  }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: draftActionsKeyboard(id) }));
}

export async function deleteDraft(ctx: Context, id: string): Promise<void> {
  try {
    const { getSupabase } = await import("../../services/supabase");
    await getSupabase().from("reels").delete().eq("id", id);
    const mem = memoryStore.get();
    const pi = mem.pendingReels.findIndex((r) => r.id === id);
    if (pi !== -1) mem.pendingReels.splice(pi, 1);
    memoryStore.save();
    await syncMemoryToGitHub();
    await ctx.answerCbQuery("✅ Draft deleted");
    await showDrafts(ctx);
  } catch (e) {
    await ctx.answerCbQuery("❌ Delete failed");
  }
}
