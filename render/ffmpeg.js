const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');

const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function createColorBackground(color, duration, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=${color}:size=${REEL_WIDTH}x${REEL_HEIGHT}:rate=30`)
      .inputOptions(['-f', 'lavfi'])
      .outputOptions([`-t ${duration}`, '-c:v libx264', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function scaleAndCropToPortrait(inputPath, outputPath, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        `scale=${REEL_WIDTH}:${REEL_HEIGHT}:force_original_aspect_ratio=increase`,
        `crop=${REEL_WIDTH}:${REEL_HEIGHT}`,
      ])
      .outputOptions([`-t ${duration}`, '-c:v libx264', '-pix_fmt yuv420p', '-an'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function concatenateClips(clipPaths, outputPath, totalDuration) {
  if (clipPaths.length === 0) {
    return createColorBackground('0x1a1a2e', totalDuration, outputPath);
  }

  const concatListPath = outputPath + '_concat.txt';
  const scaledPaths = [];

  try {
    // Scale each clip to portrait format
    for (let i = 0; i < clipPaths.length; i++) {
      const scaledPath = outputPath + `_scaled_${i}.mp4`;
      const clipDuration = Math.ceil(totalDuration / clipPaths.length);
      await scaleAndCropToPortrait(clipPaths[i], scaledPath, clipDuration);
      scaledPaths.push(scaledPath);
    }

    // Create concat file
    const concatContent = scaledPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([`-t ${totalDuration}`, '-c:v libx264', '-pix_fmt yuv420p', '-an'])
        .output(outputPath)
        .on('end', () => {
          // Cleanup
          scaledPaths.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
          try { fs.unlinkSync(concatListPath); } catch (_) {}
          resolve(outputPath);
        })
        .on('error', (err) => {
          scaledPaths.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
          try { fs.unlinkSync(concatListPath); } catch (_) {}
          reject(err);
        })
        .run();
    });
  } catch (err) {
    scaledPaths.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
    try { fs.unlinkSync(concatListPath); } catch (_) {}
    throw err;
  }
}

async function addSubtitlesFilter(videoPath, subtitles, outputPath) {
  // Build drawtext filters for each subtitle chunk
  const filters = subtitles.map((sub, i) => {
    const escapedText = sub.text
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    return `drawtext=text='${escapedText}':fontcolor=white:fontsize=52:bordercolor=black:borderw=3:x=(w-text_w)/2:y=h-200:enable='between(t,${sub.start.toFixed(2)},${sub.end.toFixed(2)})'`;
  });

  const filterChain = filters.join(',');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters(filterChain)
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function mergeVideoAndAudio(videoPath, audioPath, outputPath, targetDuration) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath);
    if (audioPath && fs.existsSync(audioPath)) {
      cmd.input(audioPath);
    }

    cmd
      .outputOptions([
        `-t ${targetDuration}`,
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-shortest',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function addWatermark(videoPath, text, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters([
        `drawtext=text='${text}':fontcolor=white@0.5:fontsize=28:x=20:y=20`,
      ])
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-c:a copy'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function extractThumbnail(videoPath, outputPath, timeOffset = 2) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timeOffset)
      .outputOptions(['-vframes 1', '-q:v 2'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function renderReel({ reelId, clipPaths, voicePath, subtitles, outputDir, duration = 30 }) {
  ensureDir(outputDir);
  const tempDir = path.join(outputDir, 'temp_' + reelId);
  ensureDir(tempDir);

  logger.info('Starting reel render', { reelId, clipCount: clipPaths.length, duration });

  const backgroundPath = path.join(tempDir, 'background.mp4');
  const subtitledPath = path.join(tempDir, 'subtitled.mp4');
  const finalPath = path.join(outputDir, `reel_${reelId}.mp4`);
  const thumbnailPath = path.join(outputDir, `thumb_${reelId}.jpg`);

  try {
    // Step 1: Assemble video background from clips
    await concatenateClips(clipPaths, backgroundPath, duration);
    logger.info('Background assembled', { reelId });

    // Step 2: Add subtitles overlay
    let videoToMerge = backgroundPath;
    if (subtitles && subtitles.length > 0) {
      try {
        await addSubtitlesFilter(backgroundPath, subtitles, subtitledPath);
        videoToMerge = subtitledPath;
        logger.info('Subtitles added', { reelId });
      } catch (subErr) {
        logger.warn('Subtitle rendering failed, skipping', { error: subErr.message });
      }
    }

    // Step 3: Merge with audio
    await mergeVideoAndAudio(videoToMerge, voicePath, finalPath, duration);
    logger.info('Video and audio merged', { reelId });

    // Step 4: Extract thumbnail
    await extractThumbnail(finalPath, thumbnailPath);
    logger.info('Thumbnail extracted', { reelId });

    return { videoPath: finalPath, thumbnailPath };
  } finally {
    // Cleanup temp files
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { renderReel, extractThumbnail };
