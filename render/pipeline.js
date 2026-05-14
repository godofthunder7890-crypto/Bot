const path = require('path');
const fs = require('fs');
const { config } = require('../config');
const logger = require('../services/logger');
const { generateScriptAndCaption, generateSubtitles } = require('../services/gemini');
const { generateVoice } = require('../services/voice');
const { fetchStockClips } = require('../services/stockFootage');
const { renderReel } = require('./ffmpeg');
const reelStore = require('../services/reelStore');
const { trackEvent } = require('../services/analytics');

async function runReelPipeline(reelId) {
  logger.info('Pipeline started', { reelId });

  const reel = await reelStore.getReelById(reelId);
  if (!reel) throw new Error(`Reel ${reelId} not found`);

  await reelStore.markReelAsProcessing(reelId);
  await trackEvent('pipeline_started', reelId, reel.created_by_chat_id);

  const outputDir = path.resolve(config.storage.reelsPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Step 1: Generate AI script and caption
    logger.info('Step 1: Generating script', { reelId });
    const { script, caption, hashtags } = await generateScriptAndCaption(reel.topic);
    await reelStore.updateReel(reelId, { script, caption, hashtags });

    // Step 2: Generate voice
    logger.info('Step 2: Generating voice', { reelId });
    let voicePath = null;
    try {
      voicePath = await generateVoice(script, reelId);
    } catch (err) {
      logger.warn('Voice generation skipped', { error: err.message });
    }

    // Step 3: Generate subtitles
    logger.info('Step 3: Generating subtitles', { reelId });
    const subtitles = await generateSubtitles(script);

    // Step 4: Fetch stock clips
    logger.info('Step 4: Fetching stock clips', { reelId });
    const clipPaths = await fetchStockClips(reel.topic, reelId, 3);

    // Step 5: Render reel
    logger.info('Step 5: Rendering reel', { reelId });
    const { videoPath, thumbnailPath } = await renderReel({
      reelId,
      clipPaths,
      voicePath,
      subtitles,
      outputDir,
      duration: 30,
    });

    // Step 6: Update reel as draft
    await reelStore.markReelAsDraft(reelId, {
      video_url: videoPath,
      thumbnail_url: thumbnailPath,
      voice_url: voicePath || '',
    });

    await trackEvent('pipeline_completed', reelId, reel.created_by_chat_id, {
      scriptLength: script.length,
      hashtagCount: hashtags.length,
      hasVoice: !!voicePath,
      clipCount: clipPaths.length,
    });

    logger.info('Pipeline completed successfully', { reelId });

    // Cleanup downloaded clips
    for (const clip of clipPaths) {
      try { fs.unlinkSync(clip); } catch (_) {}
    }
    if (voicePath) {
      try { fs.unlinkSync(voicePath); } catch (_) {}
    }

    return await reelStore.getReelById(reelId);
  } catch (err) {
    logger.error('Pipeline failed', { reelId, error: err.message });
    await reelStore.markReelAsFailed(reelId, err.message);
    await trackEvent('pipeline_failed', reelId, reel.created_by_chat_id, { error: err.message });
    throw err;
  }
}

module.exports = { runReelPipeline };
