require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { config, validateConfig } = require('./config');
const logger = require('./services/logger');
const { createBot } = require('./bot');
const { startScheduler } = require('./services/scheduler');
const { pushAgentMemory, generateAgentMemory } = require('./services/github');

async function main() {
  // Validate required environment variables
  try {
    validateConfig();
  } catch (err) {
    logger.error('Configuration validation failed', { error: err.message });
    logger.warn('Starting in limited mode — some features may not work');
  }

  // Ensure storage directories exist
  const dirs = [
    path.resolve(config.storage.reelsPath),
    path.resolve(config.storage.tempPath),
    path.resolve('./logs'),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Start Express health check server
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Telegram AI Reel Automation',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });

  app.get('/stats', async (req, res) => {
    try {
      const { getStats } = require('./services/analytics');
      const stats = await getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(config.app.port, () => {
    logger.info(`HTTP server running on port ${config.app.port}`);
  });

  // Start Telegram bot
  let bot = null;
  try {
    bot = createBot();
    logger.info('Telegram bot started');
  } catch (err) {
    logger.error('Failed to start Telegram bot', { error: err.message });
    logger.warn('Bot not running — set TELEGRAM_BOT_TOKEN to enable');
  }

  // Start scheduler (only if bot is running)
  if (bot) {
    startScheduler(bot);
  }

  // Push AGENT_MEMORY.md to GitHub on startup
  if (config.github.token) {
    const memory = generateAgentMemory({ currentStatus: 'Running' });
    await pushAgentMemory(memory).catch(err =>
      logger.warn('Could not push agent memory on startup', { error: err.message })
    );
  }

  logger.info('Telegram AI Reel Automation System started', {
    env: config.app.nodeEnv,
    port: config.app.port,
    botEnabled: !!bot,
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  function shutdown() {
    logger.info('Shutting down...');
    const { stopScheduler } = require('./services/scheduler');
    stopScheduler();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
