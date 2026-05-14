const fs = require('fs');
const { config } = require('../config');
const logger = require('../services/logger');
const reelStore = require('../services/reelStore');
const { trackEvent, getStats } = require('../services/analytics');
const { runReelPipeline } = require('../render/pipeline');
const messages = require('./messages');
const { approvalKeyboard, statsKeyboard } = require('./keyboard');

function isAdmin(chatId) {
  return String(chatId) === String(config.telegram.adminChatId);
}

async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, messages.startMessage(), { parse_mode: 'MarkdownV2' });
  await trackEvent('bot_start', null, chatId);
}

async function handleNewReel(bot, msg, match) {
  const chatId = msg.chat.id;

  if (!isAdmin(chatId)) {
    await bot.sendMessage(chatId, 'Only admins can create reels.');
    return;
  }

  const topic = match[1]?.trim();
  if (!topic) {
    await bot.sendMessage(chatId, 'Please provide a topic.\n\nExample: `/newreel Morning motivation tips`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  if (topic.length < 3 || topic.length > 200) {
    await bot.sendMessage(chatId, 'Topic must be between 3 and 200 characters.');
    return;
  }

  let reel;
  try {
    reel = await reelStore.createReel(topic, chatId);
    await bot.sendMessage(chatId, messages.processingMessage(topic, reel.id), {
      parse_mode: 'MarkdownV2',
    });
    await trackEvent('reel_requested', reel.id, chatId, { topic });
  } catch (err) {
    logger.error('Failed to create reel record', { error: err.message, chatId, topic });
    await bot.sendMessage(chatId, messages.errorMessage('Failed to start reel creation'));
    return;
  }

  // Run pipeline asynchronously
  (async () => {
    try {
      const completedReel = await runReelPipeline(reel.id);
      await sendDraftPreview(bot, chatId, completedReel);
    } catch (err) {
      logger.error('Pipeline failed for reel', { reelId: reel.id, error: err.message });
      await bot.sendMessage(
        chatId,
        `*Reel generation failed*\n\nID: \`${reel.id.substring(0, 8)}\`\nError: ${messages.escapeMarkdown(err.message)}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  })();
}

async function sendDraftPreview(bot, chatId, reel) {
  const keyboard = approvalKeyboard(reel.id);
  const caption = messages.draftReadyMessage(reel);

  if (reel.video_url && fs.existsSync(reel.video_url)) {
    try {
      await bot.sendVideo(chatId, reel.video_url, {
        caption,
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
      return;
    } catch (err) {
      logger.warn('Failed to send video, sending text preview', { error: err.message });
    }
  }

  if (reel.thumbnail_url && fs.existsSync(reel.thumbnail_url)) {
    try {
      await bot.sendPhoto(chatId, reel.thumbnail_url, {
        caption,
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
      return;
    } catch (err) {
      logger.warn('Failed to send thumbnail, sending text', { error: err.message });
    }
  }

  await bot.sendMessage(chatId, caption, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

async function handleApprove(bot, msg, match) {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;

  const reelId = match[1]?.trim();
  if (!reelId) {
    await bot.sendMessage(chatId, 'Usage: /approve [reel-id]');
    return;
  }

  const reel = await reelStore.getReelById(reelId);
  if (!reel || reel.status === 'deleted') {
    await bot.sendMessage(chatId, 'Reel not found or already deleted.');
    return;
  }

  await reelStore.approveReel(reelId);
  await trackEvent('reel_approved', reelId, chatId);
  await bot.sendMessage(chatId, messages.approvedMessage(reelId), { parse_mode: 'MarkdownV2' });
}

async function handleDelete(bot, msg, match) {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;

  const reelId = match[1]?.trim();
  if (!reelId) {
    await bot.sendMessage(chatId, 'Usage: /delete [reel-id]');
    return;
  }

  const reel = await reelStore.getReelById(reelId);
  if (!reel) {
    await bot.sendMessage(chatId, 'Reel not found.');
    return;
  }

  // Delete physical files if they exist
  if (reel.video_url && fs.existsSync(reel.video_url)) {
    try { fs.unlinkSync(reel.video_url); } catch (_) {}
  }
  if (reel.thumbnail_url && fs.existsSync(reel.thumbnail_url)) {
    try { fs.unlinkSync(reel.thumbnail_url); } catch (_) {}
  }

  await reelStore.deleteReel(reelId);
  await trackEvent('reel_deleted', reelId, chatId);
  await bot.sendMessage(chatId, messages.deletedMessage(reelId), { parse_mode: 'MarkdownV2' });
}

async function handleSchedule(bot, msg, match) {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;

  const parts = match[1]?.trim().split(/\s+/) || [];
  const reelId = parts[0];
  const timeArg = parts[1] || '1h';

  if (!reelId) {
    await bot.sendMessage(chatId, 'Usage: /schedule [reel-id] [1h|24h|48h]');
    return;
  }

  const reel = await reelStore.getReelById(reelId);
  if (!reel || !['draft', 'approved'].includes(reel.status)) {
    await bot.sendMessage(chatId, 'Reel not found or not in approvable state. Must be in draft or approved status.');
    return;
  }

  const delayMs = parseTimeArg(timeArg);
  const scheduledAt = new Date(Date.now() + delayMs).toISOString();

  await reelStore.scheduleReel(reelId, scheduledAt);
  await trackEvent('reel_scheduled', reelId, chatId, { scheduledAt });
  await bot.sendMessage(chatId, messages.scheduledMessage(reelId, scheduledAt), {
    parse_mode: 'MarkdownV2',
  });
}

async function handleStats(bot, msg) {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return;

  const stats = await getStats();
  await bot.sendMessage(chatId, messages.statsMessage(stats), {
    parse_mode: 'MarkdownV2',
    reply_markup: statsKeyboard(),
  });
  await trackEvent('stats_viewed', null, chatId);
}

async function handleCallbackQuery(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!isAdmin(chatId)) {
    await bot.answerCallbackQuery(query.id, { text: 'Not authorized' });
    return;
  }

  await bot.answerCallbackQuery(query.id);

  if (data.startsWith('approve_')) {
    const reelId = data.replace('approve_', '');
    await reelStore.approveReel(reelId);
    await trackEvent('reel_approved', reelId, chatId);
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
    await bot.sendMessage(chatId, messages.approvedMessage(reelId), { parse_mode: 'MarkdownV2' });
    return;
  }

  if (data.startsWith('delete_')) {
    const reelId = data.replace('delete_', '');
    const reel = await reelStore.getReelById(reelId);
    if (reel) {
      if (reel.video_url && fs.existsSync(reel.video_url)) {
        try { fs.unlinkSync(reel.video_url); } catch (_) {}
      }
      if (reel.thumbnail_url && fs.existsSync(reel.thumbnail_url)) {
        try { fs.unlinkSync(reel.thumbnail_url); } catch (_) {}
      }
    }
    await reelStore.deleteReel(reelId);
    await trackEvent('reel_deleted', reelId, chatId);
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
    await bot.sendMessage(chatId, messages.deletedMessage(reelId), { parse_mode: 'MarkdownV2' });
    return;
  }

  if (data.startsWith('schedule_')) {
    const parts = data.split('_');
    const timeArg = parts[1];
    const reelId = parts.slice(2).join('_');
    const delayMs = parseTimeArg(timeArg);
    const scheduledAt = new Date(Date.now() + delayMs).toISOString();
    await reelStore.scheduleReel(reelId, scheduledAt);
    await trackEvent('reel_scheduled', reelId, chatId, { scheduledAt });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
    await bot.sendMessage(chatId, messages.scheduledMessage(reelId, scheduledAt), {
      parse_mode: 'MarkdownV2',
    });
    return;
  }

  if (data === 'refresh_stats') {
    const stats = await getStats();
    await bot.editMessageText(messages.statsMessage(stats), {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'MarkdownV2',
      reply_markup: statsKeyboard(),
    });
    return;
  }

  if (data === 'view_drafts') {
    const drafts = await reelStore.listDrafts();
    if (drafts.length === 0) {
      await bot.sendMessage(chatId, 'No drafts available.');
      return;
    }
    const list = drafts
      .slice(0, 5)
      .map((r, i) => `${i + 1}\\. \`${r.id.substring(0, 8)}\` — ${messages.escapeMarkdown(r.topic)}`)
      .join('\n');
    await bot.sendMessage(chatId, `*Recent Drafts:*\n\n${list}`, { parse_mode: 'MarkdownV2' });
    return;
  }
}

function parseTimeArg(arg) {
  const match = String(arg).match(/^(\d+)(h|m|d)$/i);
  if (!match) return 60 * 60 * 1000; // default 1 hour
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * (multipliers[unit] || multipliers.h);
}

module.exports = {
  handleStart,
  handleNewReel,
  handleApprove,
  handleDelete,
  handleSchedule,
  handleStats,
  handleCallbackQuery,
  sendDraftPreview,
};
