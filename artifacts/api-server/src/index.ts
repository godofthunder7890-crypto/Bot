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

  // Step 4: Start Telegram bot
  try {
    await startBot();
    logger.info("[Main] Telegram bot started successfully");
    memoryStore.setStep("bot_running");
  } catch (botErr) {
    logger.error({ botErr }, "[Main] Failed to start Telegram bot");
    process.exit(1);
  }
});
