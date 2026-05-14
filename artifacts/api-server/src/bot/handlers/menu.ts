import { Context } from "telegraf";
import { MAIN_MENU } from "../keyboards";
import { memoryStore } from "../../storage/memory";

export async function showMainMenu(ctx: Context): Promise<void> {
  const mem = memoryStore.get();
  const text =
    `🤖 *Telegram AI Reel Agent* — v${mem.systemVersion}\n\n` +
    `📊 *Stats:*\n` +
    `• Completed Reels: ${mem.completedReels}\n` +
    `• Pending Jobs: ${mem.pendingReels.length}\n` +
    `• Failed: ${mem.failedJobs.length}\n` +
    `• Last Step: \`${mem.lastExecutedStep}\`\n\n` +
    `_Select an option below:_`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: MAIN_MENU,
    }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: MAIN_MENU }));
  } else {
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: MAIN_MENU });
  }
}

export async function showStatus(ctx: Context): Promise<void> {
  const mem = memoryStore.get();
  const text =
    `🟢 *System Status*\n\n` +
    `• Bot uptime since: \`${mem.botStartedAt}\`\n` +
    `• Last restart: \`${mem.lastRestartAt}\`\n` +
    `• Last step: \`${mem.lastExecutedStep}\`\n` +
    `• GitHub commit: \`${mem.githubLastCommit?.slice(0, 7) ?? "none"}\`\n\n` +
    `📊 *API Calls Today:*\n` +
    `• Gemini: ${mem.apiUsage.gemini}\n` +
    `• ElevenLabs: ${mem.apiUsage.elevenlabs}\n` +
    `• Pexels: ${mem.apiUsage.pexels}\n` +
    `• Pixabay: ${mem.apiUsage.pixabay}\n` +
    `• Firebase: ${mem.apiUsage.firebase}`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: MAIN_MENU,
  }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: MAIN_MENU }));
}
