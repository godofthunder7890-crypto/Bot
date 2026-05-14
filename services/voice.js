const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const logger = require('./logger');

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs default voice (Sarah)

async function generateVoiceElevenLabs(script, outputPath) {
  if (!config.elevenlabs.apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  logger.info('Generating voice with ElevenLabs', { outputPath });

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    },
    {
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.elevenlabs.apiKey,
      },
      responseType: 'arraybuffer',
    }
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  logger.info('Voice generated successfully', { outputPath });
  return outputPath;
}

async function generateVoiceFallback(script, outputPath) {
  // Fallback: use Google TTS (free, no key required for basic use)
  logger.info('Generating voice with Google TTS fallback');

  const text = encodeURIComponent(script.substring(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${text}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  logger.info('Fallback voice generated', { outputPath });
  return outputPath;
}

async function generateVoice(script, reelId) {
  const tempDir = path.resolve(config.storage.tempPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = path.join(tempDir, `voice_${reelId}.mp3`);

  try {
    if (config.elevenlabs.apiKey) {
      return await generateVoiceElevenLabs(script, outputPath);
    }
    return await generateVoiceFallback(script, outputPath);
  } catch (err) {
    logger.warn('Primary voice generation failed, trying fallback', { error: err.message });
    try {
      return await generateVoiceFallback(script, outputPath);
    } catch (fallbackErr) {
      logger.error('All voice generation methods failed', { error: fallbackErr.message });
      throw new Error('Voice generation failed: ' + fallbackErr.message);
    }
  }
}

module.exports = { generateVoice };
