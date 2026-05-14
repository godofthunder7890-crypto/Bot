const { getSupabase } = require('../config/supabase');
const logger = require('./logger');

async function trackEvent(eventType, reelId = null, chatId = '', eventData = {}) {
  try {
    const supabase = getSupabase();
    await supabase.from('analytics').insert({
      reel_id: reelId,
      event_type: eventType,
      event_data: eventData,
      chat_id: String(chatId),
    });
  } catch (err) {
    logger.error('Failed to track analytics event', { eventType, error: err.message });
  }
}

async function getStats() {
  try {
    const supabase = getSupabase();

    const [reelsResult, analyticsResult] = await Promise.all([
      supabase.from('reels').select('status, created_at'),
      supabase
        .from('analytics')
        .select('event_type, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const reels = reelsResult.data || [];
    const events = analyticsResult.data || [];

    const statusCounts = reels.reduce((acc, reel) => {
      acc[reel.status] = (acc[reel.status] || 0) + 1;
      return acc;
    }, {});

    const eventCounts = events.reduce((acc, ev) => {
      acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalReels: reels.length,
      byStatus: statusCounts,
      last7DaysEvents: eventCounts,
      drafts: statusCounts['draft'] || 0,
      approved: statusCounts['approved'] || 0,
      published: statusCounts['published'] || 0,
      deleted: statusCounts['deleted'] || 0,
    };
  } catch (err) {
    logger.error('Failed to get stats', { error: err.message });
    return null;
  }
}

module.exports = { trackEvent, getStats };
