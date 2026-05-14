import { logger } from "../lib/logger";

export interface SecretsMap {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  GEMINI_API_KEY: string;
  PEXELS_API_KEY: string;
  PIXABAY_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RAILWAY_TOKEN: string;
  FIREBASE_API_KEY: string;
}

const REQUIRED_SECRETS: (keyof SecretsMap)[] = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "GEMINI_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
  "ELEVENLABS_API_KEY",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FIREBASE_API_KEY",
];

function obfuscate(val: string): string {
  return Buffer.from(val).toString("base64");
}
function reveal(val: string): string {
  return Buffer.from(val, "base64").toString("utf8");
}

class SecretManager {
  private store = new Map<string, string>();
  private ready = false;

  validate(): void {
    const missing: string[] = [];
    for (const key of REQUIRED_SECRETS) {
      const val = process.env[key];
      if (!val) {
        missing.push(key);
      } else {
        this.store.set(key, obfuscate(val));
      }
    }
    if (missing.length > 0) {
      logger.error({ missing }, "STARTUP FAILED — missing secrets");
      throw new Error(`Missing required secrets: ${missing.join(", ")}`);
    }
    this.ready = true;
    logger.info(`[SecretManager] All ${REQUIRED_SECRETS.length} secrets validated OK`);
  }

  get(key: keyof SecretsMap): string {
    if (!this.ready) throw new Error("SecretManager.validate() not called yet");
    const v = this.store.get(key);
    if (!v) throw new Error(`Secret '${key}' not found`);
    return reveal(v);
  }

  safeLog(key: keyof SecretsMap): string {
    const val = this.get(key);
    return val.slice(0, 6) + "***" + val.slice(-4);
  }
}

export const secrets = new SecretManager();
