const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { config } = require('../config');

const logsDir = path.resolve('./logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.app.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Also persist critical logs to Supabase asynchronously
async function persistLog(level, message, context = {}) {
  try {
    const { getSupabase } = require('../config/supabase');
    const supabase = getSupabase();
    await supabase.from('bot_logs').insert({ level, message, context });
  } catch (_err) {
    // Silently fail - don't crash app on log persistence failure
  }
}

const wrappedLogger = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
    persistLog('warn', message, meta);
  },
  error: (message, meta = {}) => {
    logger.error(message, meta);
    persistLog('error', message, meta);
  },
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
};

module.exports = wrappedLogger;
