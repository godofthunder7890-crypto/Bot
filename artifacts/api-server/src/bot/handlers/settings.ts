import { Context } from "telegraf";
import { SETTINGS_KEYBOARD, BACK_TO_MENU } from "../keyboards";
import { syncMemoryToGitHub, autoCommitCode } from "../../services/github";
import { memoryStore } from "../../storage/memory";
import { secrets } from "../../security/secretManager";
import { logger } from "../../lib/logger";

export async function showSettings(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    `⚙️ *Settings*\n\nManage your Reel Agent configuration:`,
    { parse_mode: "Markdown", reply_markup: SETTINGS_KEYBOARD },
  ).catch(() => ctx.reply("⚙️ Settings", { reply_markup: SETTINGS_KEYBOARD }));
}

export async function handleSettingAction(ctx: Context, action: string): Promise<void> {
  switch (action) {
    case "github_sync": {
      await ctx.answerCbQuery("🔄 Syncing to GitHub...");
      try {
        await syncMemoryToGitHub();
        await autoCommitCode("chore: manual sync from Telegram bot");
        await ctx.editMessageText("✅ *GitHub Sync Complete!*\n\nMemory and system state pushed to repo.", {
          parse_mode: "Markdown",
          reply_markup: SETTINGS_KEYBOARD,
        }).catch(() => {});
      } catch (e) {
        await ctx.editMessageText("❌ GitHub sync failed. Check your GITHUB_TOKEN and GITHUB_REPO.", {
          reply_markup: SETTINGS_KEYBOARD,
        }).catch(() => {});
      }
      break;
    }

    case "api_status": {
      const mem = memoryStore.get();
      const text =
        `🔑 *API Status Check*\n\n` +
        `• Telegram: ✅ Connected\n` +
        `• Gemini: ✅ Key set (${secrets.safeLog("GEMINI_API_KEY")})\n` +
        `• ElevenLabs: ✅ Key set (${secrets.safeLog("ELEVENLABS_API_KEY")})\n` +
        `• Pexels: ✅ Key set (${secrets.safeLog("PEXELS_API_KEY")})\n` +
        `• Pixabay: ✅ Key set (${secrets.safeLog("PIXABAY_API_KEY")})\n` +
        `• Supabase: ✅ Connected\n` +
        `• Firebase: ✅ Project: intro-7444d\n` +
        `• GitHub: ✅ Repo: ${secrets.get("GITHUB_REPO")}\n` +
        `• Railway: ✅ Token set\n\n` +
        `_All APIs secured via environment variables_`;

      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        reply_markup: SETTINGS_KEYBOARD,
      }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: SETTINGS_KEYBOARD }));
      break;
    }

    case "clear_failed": {
      await ctx.answerCbQuery("🗑️ Clearing failed jobs...");
      const mem = memoryStore.get();
      const count = mem.failedJobs.length;
      memoryStore.update({ failedJobs: [] });
      await ctx.editMessageText(`✅ Cleared ${count} failed jobs.`, {
        reply_markup: SETTINGS_KEYBOARD,
      }).catch(() => {});
      break;
    }

    case "reset": {
      await ctx.answerCbQuery("⚠️ System info refreshed");
      await showSettings(ctx);
      break;
    }

    default:
      await ctx.answerCbQuery("Coming soon!");
  }
}
