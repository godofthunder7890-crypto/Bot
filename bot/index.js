const TelegramBot = require('node-telegram-bot-api');
const { config } = require('../config');
const logger = require('../services/logger');
const commands = require('./commands');

let botInstance = null;

function createBot() {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const bot = new TelegramBot(config.telegram.botToken, { polling: true });

  bot.on('polling_error', (err) => {
    logger.error('Telegram polling error', { message: err.message, code: err.code });
  });

  bot.on('error', (err) => {
    logger.error('Telegram bot error', { message: err.message });
  });

  // /start
  bot.onText(/\/start/, (msg) => commands.handleStart(bot, msg));

  // /newreel [topic]
  bot.onText(/\/newreel(?:\s+(.+))?/, (msg, match) => commands.handleNewReel(bot, msg, match));

  // /approve [id]
  bot.onText(/\/approve(?:\s+(.+))?/, (msg, match) => commands.handleApprove(bot, msg, match));

  // /delete [id]
  bot.onText(/\/delete(?:\s+(.+))?/, (msg, match) => commands.handleDelete(bot, msg, match));

  // /schedule [id] [time]
  bot.onText(/\/schedule(?:\s+(.+))?/, (msg, match) => commands.handleSchedule(bot, msg, match));

  // /stats
  bot.onText(/\/stats/, (msg) => commands.handleStats(bot, msg));

  // Callback queries (inline keyboard buttons)
  bot.on('callback_query', (query) => commands.handleCallbackQuery(bot, query));

  logger.info('Telegram bot initialized and polling');
  botInstance = bot;
  return bot;
}

function getBot() {
  return botInstance;
}

module.exports = { createBot, getBot };
