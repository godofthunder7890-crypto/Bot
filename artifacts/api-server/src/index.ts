import app from "./app";
import { logger } from "./lib/logger";
import { secrets } from "./security/secretManager";
import { memoryStore } from "./storage/memory";
import { startBot } from "./bot/index";

// Step 1: Validate all secrets at startup
secrets.validate();

// Step 2: Load/resume memory
memoryStore.setStep("server_starting");

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

// Step 3: Start Express server
app.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error starting server");
    process.exit(1);
  }
  logger.info({ port }, "Express server listening");
  memoryStore.setStep("server_ready");

  // Step 4: Start Telegram bot (non-blocking — server stays up even if bot has issues)
  startBot()
    .then(() => {
      logger.info("[Main] Telegram bot started successfully");
      memoryStore.setStep("bot_running");
    })
    .catch((botErr: unknown) => {
      const msg = botErr instanceof Error ? botErr.message : JSON.stringify(botErr);
      logger.error({ msg }, "[Main] Telegram bot failed to start — check TELEGRAM_BOT_TOKEN");
      memoryStore.setStep("bot_failed");
      // Don't exit — Express server keeps running for health checks
    });
});
