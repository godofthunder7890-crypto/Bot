import { Telegraf, Context } from "telegraf";
import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";
import { showMainMenu, showStatus } from "./handlers/menu";
import {
  startCreateReel,
  handleNicheSelected,
  handleAiTrendingTopics,
  handleCustomTopicPrompt,
  generateReelPipeline,
  pendingTopicInput,
} from "./handlers/reels";
import { showDrafts, showDraftDetail, deleteDraft } from "./handlers/drafts";
import { showAnalytics } from "./handlers/analytics";
import { showPromotion, handlePromoAction } from "./handlers/promotion";
import { showSettings, handleSettingAction } from "./handlers/settings";
import { syncMemoryToGitHub } from "../services/github";

let bot: Telegraf | null = null;

function isAdmin(ctx: Context): boolean {
  const adminId = secrets.get("TELEGRAM_CHAT_ID");
  return String(ctx.from?.id) === adminId;
}

function adminGuard(handler: (ctx: Context) => Promise<void>) {
  return async (ctx: Context) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery?.("⛔ Unauthorized").catch(() => {});
      return;
    }
    await handler(ctx);
  };
}

export function createBot(): Telegraf {
  bot = new Telegraf(secrets.get("TELEGRAM_BOT_TOKEN"));

  // Any message from admin → show main menu
  bot.on("message", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const userId = ctx.from?.id;
    const text = "text" in ctx.message ? ctx.message.text : "";

    // Handle pending topic input
    if (userId && pendingTopicInput.has(userId) && text) {
      const { niche } = pendingTopicInput.get(userId)!;
      pendingTopicInput.delete(userId);
      await generateReelPipeline(ctx, text, niche);
      return;
    }

    // Default: show main menu
    await showMainMenu(ctx);
  });

  // Callback query router
  bot.on("callback_query", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery("⛔ Unauthorized");
      return;
    }

    await ctx.answerCbQuery().catch(() => {});
    const data = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : "";
    if (!data) return;

    const [ns, action, ...rest] = data.split(":");

    try {
      switch (ns) {
        case "menu":
          switch (action) {
            case "main":    await showMainMenu(ctx); break;
            case "create":  await startCreateReel(ctx); break;
            case "drafts":  await showDrafts(ctx); break;
            case "analytics": await showAnalytics(ctx); break;
            case "promotion": await showPromotion(ctx); break;
            case "settings": await showSettings(ctx); break;
            case "status":  await showStatus(ctx); break;
          }
          break;

        case "niche":
          await handleNicheSelected(ctx, action!);
          break;

        case "topic":
          if (action === "ai_trending") await handleAiTrendingTopics(ctx);
          else if (action === "custom")  await handleCustomTopicPrompt(ctx);
          else if (action === "select") {
            // topic:select:0:Topic Name
            const topicName = rest.slice(1).join(":");
            const userId = ctx.from?.id;
            const pending = userId ? pendingTopicInput.get(userId) : null;
            const niche = pending?.niche ?? "general";
            if (userId) pendingTopicInput.delete(userId);
            await generateReelPipeline(ctx, topicName, niche);
          }
          break;

        case "reel":
          if (action === "approve") {
            await ctx.editMessageText("✅ *Reel approved!*\n\nSyncing to GitHub...", { parse_mode: "Markdown" }).catch(() => {});
            await syncMemoryToGitHub();
            await showMainMenu(ctx);
          } else if (action === "regenerate") {
            await startCreateReel(ctx);
          } else if (action === "delete") {
            await ctx.editMessageText("🗑️ Draft deleted.", {}).catch(() => {});
            await showMainMenu(ctx);
          }
          break;

        case "draft":
          if (action === "view")    await showDraftDetail(ctx, rest[0]!);
          else if (action === "delete") await deleteDraft(ctx, rest[0]!);
          else if (action === "approve") {
            await syncMemoryToGitHub();
            await ctx.answerCbQuery("✅ Approved & synced to GitHub!");
            await showDrafts(ctx);
          }
          else if (action === "regen") {
            await startCreateReel(ctx);
          }
          else if (action === "promote") await showPromotion(ctx);
          break;

        case "promo":
          await handlePromoAction(ctx, action!);
          break;

        case "settings":
          await handleSettingAction(ctx, action!);
          break;

        default:
          logger.warn({ data }, "[Bot] Unknown callback");
      }
    } catch (err) {
      logger.error({ err, data }, "[Bot] Callback handler error");
      await ctx.reply("❌ Something went wrong. Tap below to go back.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "menu:main" }]] },
      }).catch(() => {});
    }
  });

  bot.catch((err, ctx) => {
    logger.error({ err, update: ctx.update }, "[Bot] Global error");
  });

  return bot;
}

export async function startBot(): Promise<void> {
  const b = createBot();
  memoryStore.setStep("bot_polling_start");
  logger.info("[Bot] Starting polling...");

  // Step 1: Clear any existing webhook/polling session
  try {
    await b.telegram.deleteWebhook({ drop_pending_updates: true });
    logger.info("[Bot] Webhook cleared");
  } catch {
    logger.warn("[Bot] deleteWebhook failed — continuing anyway");
  }

  // Step 2: Wait 3s for Telegram servers to release the previous session
  await new Promise<void>((r) => setTimeout(r, 3000));

  // Step 3: Launch polling with retry on 409
  let launched = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        b.launch({
          allowedUpdates: ["message", "callback_query"],
          dropPendingUpdates: true,
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("409") && attempt < 3) {
            logger.warn({ attempt }, "[Bot] 409 Conflict — will retry after delay");
            resolve(); // resolve to exit this attempt, loop will retry
          } else {
            logger.error({ msg }, "[Bot] launch() failed");
            reject(err);
          }
        });
        // Consider launched if no error after 8 seconds
        setTimeout(() => { launched = true; resolve(); }, 8000);
      });
      if (launched) break;
      // Wait before retry
      await new Promise<void>((r) => setTimeout(r, 5000 * attempt));
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise<void>((r) => setTimeout(r, 5000 * attempt));
    }
  }

  logger.info("[Bot] Polling started successfully");

  // Send startup message to admin (after launch)
  const adminChatId = secrets.get("TELEGRAM_CHAT_ID");
  const mem = memoryStore.get();
  await b.telegram
    .sendMessage(
      adminChatId,
      `🟢 *Reel Agent Online* — v${mem.systemVersion}\n\n` +
        `✅ All secrets loaded\n` +
        `🔄 Resuming from: \`${mem.lastExecutedStep}\`\n` +
        `📊 Completed reels: ${mem.completedReels}\n\n` +
        `_Tap any button to get started:_`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 Open Main Menu", callback_data: "menu:main" }]],
        },
      },
    )
    .then(() => logger.info("[Bot] Startup message sent to admin"))
    .catch((e: unknown) => logger.warn({ e }, "[Bot] Could not send startup message"));

  process.once("SIGINT", () => b.stop("SIGINT"));
  process.once("SIGTERM", () => b.stop("SIGTERM"));
}
