const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');
const logger = require('./logger');

let genAI = null;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

async function generateScript(topic) {
  logger.info('Generating script', { topic });
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a viral short-form video scriptwriter. Create a compelling 30-second script for a vertical reel about: "${topic}"

Requirements:
- Hook in first 3 seconds (attention-grabbing opening line)
- Fast-paced, punchy sentences
- Conversational tone
- Clear value or entertainment
- Strong call-to-action at end
- Total script: 80-100 words max
- Format: Just the spoken words, no stage directions

Output ONLY the script text, nothing else.`;

  const result = await model.generateContent(prompt);
  const script = result.response.text().trim();
  logger.info('Script generated', { topic, length: script.length });
  return script;
}

async function generateCaption(topic, script) {
  logger.info('Generating caption', { topic });
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Create a viral Instagram/TikTok caption for this reel:

Topic: ${topic}
Script: ${script}

Requirements:
- Engaging first line (no hashtags in first line)
- 2-3 sentences max
- Emoji usage: 2-4 relevant emojis
- End with 1 call-to-action question
- Then 15-20 relevant hashtags on a new line
- Mix of popular and niche hashtags

Output format:
[Caption text with emojis]

[hashtags]`;

  const result = await model.generateContent(prompt);
  const fullCaption = result.response.text().trim();

  const parts = fullCaption.split('\n\n');
  const captionText = parts[0] || fullCaption;
  const hashtagLine = parts[parts.length - 1] || '';
  const hashtags = hashtagLine.match(/#\w+/g) || [];

  logger.info('Caption generated', { topic, hashtagCount: hashtags.length });
  return { caption: captionText, hashtags };
}

async function generateScriptAndCaption(topic) {
  const script = await generateScript(topic);
  const { caption, hashtags } = await generateCaption(topic, script);
  return { script, caption, hashtags };
}

async function generateSubtitles(script) {
  const words = script.split(/\s+/);
  const wordsPerSecond = 2.5;
  const subtitles = [];
  let currentTime = 0;
  let chunkSize = 5;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    const duration = chunk.split(/\s+/).length / wordsPerSecond;
    subtitles.push({
      start: currentTime,
      end: currentTime + duration,
      text: chunk,
    });
    currentTime += duration;
  }

  return subtitles;
}

module.exports = { generateScript, generateCaption, generateScriptAndCaption, generateSubtitles };
