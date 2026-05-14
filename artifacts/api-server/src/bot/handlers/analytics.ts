import { Context } from "telegraf";
import { getAnalytics } from "../../services/supabase";
import { memoryStore } from "../../storage/memory";
import { BACK_TO_MENU } from "../keyboards";

export async function showAnalytics(ctx: Context): Promise<void> {
  const mem = memoryStore.get();
  let dbStats: Record<string, number> = {};
  try {
    dbStats = await getAnalytics();
  } catch {}

  const totalDb = Object.values(dbStats).reduce((a, b) => a + b, 0);
  const text =
    `📊 *Analytics Dashboard*\n\n` +
    `🎬 *Reel Stats:*\n` +
    `• Total Generated: ${mem.totalReelsGenerated}\n` +
    `• Completed: ${mem.completedReels}\n` +
    `• Pending: ${mem.pendingReels.length}\n` +
    `• Failed: ${mem.failedJobs.length}\n` +
    `• DB Total: ${totalDb}\n\n` +
    `🤖 *API Usage (Session):*\n` +
    `• Gemini AI: ${mem.apiUsage.gemini} calls\n` +
    `• ElevenLabs: ${mem.apiUsage.elevenlabs} calls\n` +
    `• Pexels: ${mem.apiUsage.pexels} calls\n` +
    `• Pixabay: ${mem.apiUsage.pixabay} calls\n` +
    `• Firebase: ${mem.apiUsage.firebase} calls\n\n` +
    `🐙 *GitHub:*\n` +
    `• Last Commit: \`${mem.githubLastCommit?.slice(0, 7) ?? "none"}\`\n` +
    `• Commit Time: ${mem.githubLastCommitAt ? new Date(mem.githubLastCommitAt).toLocaleString() : "Never"}\n\n` +
    `🚂 *Railway:*\n` +
    `• Status: ${mem.deploymentStatus}\n` +
    `• URL: ${mem.railwayDeployUrl ?? "Not configured"}`;

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: BACK_TO_MENU,
  }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: BACK_TO_MENU }));
}
