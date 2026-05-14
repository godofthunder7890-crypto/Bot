const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const logger = require('./logger');

async function searchPexelsVideos(query, perPage = 5) {
  if (!config.pexels.apiKey) {
    logger.warn('Pexels API key not configured, using placeholder');
    return [];
  }

  try {
    const response = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query,
        per_page: perPage,
        orientation: 'portrait',
        size: 'medium',
      },
      headers: { Authorization: config.pexels.apiKey },
    });

    const videos = response.data.videos || [];
    logger.info('Pexels videos found', { query, count: videos.length });
    return videos;
  } catch (err) {
    logger.error('Pexels search failed', { query, error: err.message });
    return [];
  }
}

function getBestVideoFile(video) {
  const files = video.video_files || [];
  // Prefer HD portrait files
  const portrait = files.filter(f => f.quality === 'hd' && f.height > f.width);
  if (portrait.length > 0) return portrait[0];
  // Fall back to any HD
  const hd = files.filter(f => f.quality === 'hd');
  if (hd.length > 0) return hd[0];
  return files[0] || null;
}

async function downloadVideo(url, outputPath) {
  logger.info('Downloading video', { url: url.substring(0, 60), outputPath });
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function fetchStockClips(topic, reelId, clipCount = 3) {
  const tempDir = path.resolve(config.storage.tempPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const keywords = extractKeywords(topic);
  const downloadedPaths = [];

  for (const keyword of keywords) {
    if (downloadedPaths.length >= clipCount) break;

    const videos = await searchPexelsVideos(keyword, 3);
    for (const video of videos) {
      if (downloadedPaths.length >= clipCount) break;

      const file = getBestVideoFile(video);
      if (!file) continue;

      const outputPath = path.join(tempDir, `clip_${reelId}_${downloadedPaths.length}.mp4`);
      try {
        await downloadVideo(file.link, outputPath);
        downloadedPaths.push(outputPath);
        logger.info('Clip downloaded', { path: outputPath });
      } catch (err) {
        logger.warn('Failed to download clip', { error: err.message });
      }
    }
  }

  // If no clips downloaded, create a placeholder
  if (downloadedPaths.length === 0) {
    logger.warn('No stock clips available, will use color background');
  }

  return downloadedPaths;
}

function extractKeywords(topic) {
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'how', 'why', 'what', 'when', 'is', 'are', 'was', 'were']);
  const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const unique = [...new Set(words)];
  // Return top 3 keywords + original topic
  return [topic, ...unique.slice(0, 2)];
}

module.exports = { fetchStockClips, searchPexelsVideos };
