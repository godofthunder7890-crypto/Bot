const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const logger = require('./logger');

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  return {
    Authorization: `token ${config.github.token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TelegramReelBot/1.0',
  };
}

async function getFileContent(filePath) {
  const { owner, repo } = config.github;
  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
      { headers: getHeaders() }
    );
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

async function upsertFile(filePath, content, commitMessage) {
  const { owner, repo } = config.github;
  const existing = await getFileContent(filePath);

  const body = {
    message: commitMessage,
    content: Buffer.from(content).toString('base64'),
  };

  if (existing?.sha) {
    body.sha = existing.sha;
  }

  await axios.put(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    body,
    { headers: getHeaders() }
  );

  logger.info('File pushed to GitHub', { filePath });
}

async function pushAgentMemory(memoryContent) {
  if (!config.github.token || !config.github.owner || !config.github.repo) {
    logger.warn('GitHub not configured, skipping memory push');
    return;
  }

  try {
    await upsertFile(
      'AGENT_MEMORY.md',
      memoryContent,
      `chore: update AGENT_MEMORY.md [${new Date().toISOString()}]`
    );
  } catch (err) {
    logger.error('Failed to push AGENT_MEMORY to GitHub', { error: err.message });
  }
}

async function createRepository() {
  if (!config.github.token) {
    logger.warn('GitHub token not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `${GITHUB_API}/user/repos`,
      {
        name: config.github.repo,
        description: 'Telegram AI Reel Automation System',
        private: true,
        auto_init: false,
      },
      { headers: getHeaders() }
    );
    logger.info('GitHub repository created', { repo: response.data.full_name });
    return response.data;
  } catch (err) {
    if (err.response?.status === 422) {
      logger.info('Repository already exists');
      return null;
    }
    logger.error('Failed to create GitHub repository', { error: err.message });
    return null;
  }
}

function generateAgentMemory(status) {
  return `# AGENT_MEMORY.md
*Last Updated: ${new Date().toISOString()}*

## Current Project Status
${status.currentStatus || 'Active - Bot running and processing reels'}

## Project Overview
Telegram AI Reel Automation System — generates AI-powered short-form videos
and sends them to Telegram admin for approval.

## Completed Features
${(status.completedFeatures || [
  'Telegram bot with full command set (/start, /newreel, /approve, /delete, /schedule, /stats)',
  'Gemini AI script and caption generation',
  'AI voice generation (ElevenLabs + Google TTS fallback)',
  'Pexels stock footage fetching',
  'FFmpeg 9:16 vertical reel rendering with subtitles',
  'Draft approval system via inline keyboard',
  'Reel scheduling with cron jobs',
  'Supabase database (reels, schedules, analytics, logs)',
  'Winston logging (file + Supabase persistence)',
  'GitHub auto-push integration',
  'Express.js health check server',
  'Railway deployment configuration',
]).map(f => `- ${f}`).join('\n')}

## Pending Tasks
${(status.pendingTasks || [
  'Connect real Telegram bot token',
  'Configure Gemini API key',
  'Set Pexels API key for stock footage',
  'Optional: ElevenLabs for premium voice',
  'Deploy to Railway',
]).map(t => `- ${t}`).join('\n')}

## APIs Used
| API | Purpose | Required |
|-----|---------|----------|
| Telegram Bot API | Bot control, messaging | YES |
| Google Gemini | Script/caption generation | YES |
| Supabase | Database, storage | YES |
| Pexels | Free stock footage | Recommended |
| ElevenLabs | AI voice generation | Optional |
| GitHub | Code repository, auto-push | Optional |

## Deployment Status
- Platform: Railway (railway.toml configured)
- Node version: 18+
- Environment: All secrets in .env / Railway env vars

## Current Bugs
${(status.bugs || ['None known']).map(b => `- ${b}`).join('\n')}

## Folder Explanations
\`\`\`
/bot          - Telegram bot handlers, commands, keyboards, messages
/services     - Core services: AI, voice, stock footage, analytics, logger
/render       - FFmpeg rendering pipeline and utilities
/templates    - Subtitle and video templates
/storage      - Generated reels and temp files (gitignored)
/config       - App config, Supabase client
/logs         - Log files (gitignored)
/docs         - Documentation files
\`\`\`

## How to Continue This Project
1. Clone the repository
2. Run \`npm install\`
3. Copy \`.env.example\` to \`.env\` and fill in API keys
4. Run \`node index.js\`
5. Reference SETUP_GUIDE.md for full instructions

## Future Roadmap
- Multi-platform posting (Instagram, TikTok)
- Background music library
- Template system for different reel styles
- AI thumbnail generation
- Analytics dashboard web UI
- Batch reel generation
- Custom voice training
`;
}

module.exports = { pushAgentMemory, createRepository, upsertFile, generateAgentMemory };
