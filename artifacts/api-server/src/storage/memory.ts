import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

export type ReelStatus = "pending" | "generating" | "rendering" | "done" | "failed";

export interface ReelJob {
  id: string;
  topic: string;
  niche: string;
  status: ReelStatus;
  step: string;
  scriptText?: string;
  voiceUrl?: string;
  videoClips?: string[];
  outputPath?: string;
  firebaseUrl?: string;
  telegramMessageId?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemory {
  systemVersion: string;
  lastRestartAt: string;
  lastExecutedStep: string;
  pendingReels: ReelJob[];
  failedJobs: ReelJob[];
  completedReels: number;
  totalReelsGenerated: number;
  apiUsage: {
    gemini: number;
    elevenlabs: number;
    pexels: number;
    pixabay: number;
    firebase: number;
  };
  deploymentStatus: "idle" | "deploying" | "deployed" | "failed";
  githubLastCommit?: string;
  githubLastCommitAt?: string;
  railwayDeployUrl?: string;
  botStartedAt: string;
}

const MEMORY_PATH = path.resolve(process.cwd(), "AGENT_MEMORY.json");
const MD_PATH = path.resolve(process.cwd(), "AGENT_MEMORY.md");

const DEFAULT: AgentMemory = {
  systemVersion: "2.0.0",
  lastRestartAt: new Date().toISOString(),
  lastExecutedStep: "system_boot",
  pendingReels: [],
  failedJobs: [],
  completedReels: 0,
  totalReelsGenerated: 0,
  apiUsage: { gemini: 0, elevenlabs: 0, pexels: 0, pixabay: 0, firebase: 0 },
  deploymentStatus: "idle",
  botStartedAt: new Date().toISOString(),
};

class MemoryStore {
  private mem: AgentMemory;

  constructor() {
    this.mem = this.load();
  }

  private load(): AgentMemory {
    try {
      if (fs.existsSync(MEMORY_PATH)) {
        const raw = fs.readFileSync(MEMORY_PATH, "utf8");
        const parsed = JSON.parse(raw) as AgentMemory;
        logger.info({ step: parsed.lastExecutedStep }, "[Memory] Resuming from saved state");
        return { ...parsed, lastRestartAt: new Date().toISOString() };
      }
    } catch (e) {
      logger.warn("[Memory] Could not load saved state, starting fresh");
    }
    return { ...DEFAULT };
  }

  private saveMd(): void {
    const m = this.mem;
    const md = `# AGENT MEMORY — Telegram Reel Bot

> Auto-updated every save. Last update: ${new Date().toISOString()}

## System Info
| Field | Value |
|-------|-------|
| Version | ${m.systemVersion} |
| Bot Started | ${m.botStartedAt} |
| Last Restart | ${m.lastRestartAt} |
| Last Step | \`${m.lastExecutedStep}\` |
| Deployment | ${m.deploymentStatus} |
| Railway URL | ${m.railwayDeployUrl ?? "Not set"} |
| Last GitHub Commit | ${m.githubLastCommit ?? "None"} |

## Reel Stats
| Metric | Count |
|--------|-------|
| Completed Reels | ${m.completedReels} |
| Total Generated | ${m.totalReelsGenerated} |
| Pending Jobs | ${m.pendingReels.length} |
| Failed Jobs | ${m.failedJobs.length} |

## API Usage
| API | Calls |
|-----|-------|
| Gemini | ${m.apiUsage.gemini} |
| ElevenLabs | ${m.apiUsage.elevenlabs} |
| Pexels | ${m.apiUsage.pexels} |
| Pixabay | ${m.apiUsage.pixabay} |
| Firebase | ${m.apiUsage.firebase} |

## Pending Reels
${m.pendingReels.length === 0 ? "_No pending reels_" : m.pendingReels.map((r) => `- **${r.topic}** (${r.status}) — Step: \`${r.step}\``).join("\n")}

## Failed Jobs
${m.failedJobs.length === 0 ? "_No failed jobs_" : m.failedJobs.map((r) => `- **${r.topic}** — Error: ${r.error}`).join("\n")}
`;
    try {
      fs.writeFileSync(MD_PATH, md, "utf8");
    } catch {}
  }

  save(): void {
    try {
      fs.writeFileSync(MEMORY_PATH, JSON.stringify(this.mem, null, 2));
      this.saveMd();
    } catch (e) {
      logger.error("[Memory] Save failed");
    }
  }

  get(): AgentMemory { return this.mem; }

  setStep(step: string): void {
    this.mem.lastExecutedStep = step;
    this.save();
  }

  update(patch: Partial<AgentMemory>): void {
    this.mem = { ...this.mem, ...patch };
    this.save();
  }

  addReel(job: ReelJob): void {
    this.mem.pendingReels.push(job);
    this.mem.totalReelsGenerated++;
    this.save();
  }

  updateReel(id: string, patch: Partial<ReelJob>): void {
    const i = this.mem.pendingReels.findIndex((r) => r.id === id);
    if (i !== -1) {
      this.mem.pendingReels[i] = {
        ...this.mem.pendingReels[i]!,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
  }

  failReel(id: string, error: string): void {
    const i = this.mem.pendingReels.findIndex((r) => r.id === id);
    if (i !== -1) {
      const job = { ...this.mem.pendingReels[i]!, status: "failed" as const, error, updatedAt: new Date().toISOString() };
      this.mem.pendingReels.splice(i, 1);
      this.mem.failedJobs.push(job);
      this.save();
    }
  }

  completeReel(id: string): void {
    const i = this.mem.pendingReels.findIndex((r) => r.id === id);
    if (i !== -1) {
      this.mem.pendingReels.splice(i, 1);
      this.mem.completedReels++;
      this.save();
    }
  }

  incApi(api: keyof AgentMemory["apiUsage"]): void {
    this.mem.apiUsage[api]++;
    this.save();
  }
}

export const memoryStore = new MemoryStore();
