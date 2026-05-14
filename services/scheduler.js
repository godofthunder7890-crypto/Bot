const { CronJob } = require('cron');
const { config } = require('../config');
const logger = require('./logger');
const reelStore = require('./reelStore');
const { trackEvent } = require('./analytics');

let schedulerJob = null;

async function processPendingSchedules(bot) {
  try {
    const pending = await reelStore.getPendingSchedules();
    if (pending.length === 0) return;

    logger.info('Processing scheduled reels', { count: pending.length });

    for (const schedule of pending) {
      const reel = schedule.reels;
      if (!reel) continue;

      try {
        await sendScheduledReel(bot, schedule, reel);
        await reelStore.markScheduleSent(schedule.id);
        await reelStore.updateReel(reel.id, { status: 'published' });
        await trackEvent('reel_published', reel.id, config.telegram.adminChatId, {
          scheduleId: schedule.id,
        });
        logger.info('Scheduled reel sent', { reelId: reel.id, scheduleId: schedule.id });
      } catch (err) {
        logger.error('Failed to send scheduled reel', {
          reelId: reel.id,
          scheduleId: schedule.id,
          error: err.message,
        });
      }
    }
  } catch (err) {
    logger.error('Scheduler run failed', { error: err.message });
  }
}

async function sendScheduledReel(bot, schedule, reel) {
  const chatId = config.telegram.adminChatId;
  const fs = require('fs');

  const caption = `*Published Reel*\n\n*Topic:* ${reel.topic}\n\n${reel.caption}\n\n${(reel.hashtags || []).join(' ')}`;

  if (reel.video_url && fs.existsSync(reel.video_url)) {
    await bot.sendVideo(chatId, reel.video_url, {
      caption,
      parse_mode: 'Markdown',
    });
    return;
  }

  await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
}

function startScheduler(bot) {
  if (schedulerJob) {
    schedulerJob.stop();
  }

  // Run every minute to check for pending schedules
  schedulerJob = new CronJob('* * * * *', () => {
    processPendingSchedules(bot);
  });

  schedulerJob.start();
  logger.info('Reel scheduler started (checking every minute)');
  return schedulerJob;
}

function stopScheduler() {
  if (schedulerJob) {
    schedulerJob.stop();
    schedulerJob = null;
    logger.info('Reel scheduler stopped');
  }
}

module.exports = { startScheduler, stopScheduler, processPendingSchedules };
