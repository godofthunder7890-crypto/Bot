import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

const TMP_DIR = path.resolve(process.cwd(), "tmp");

function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function ffmpegAvailable(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface RenderOptions {
  clips: string[];
  audioPath: string;
  outputPath: string;
  reelId: string;
}

export async function renderReel(opts: RenderOptions): Promise<string> {
  ensureTmpDir();

  if (!ffmpegAvailable()) {
    logger.warn("[FFmpeg] ffmpeg not found — creating placeholder");
    return createPlaceholder(opts.reelId);
  }

  if (opts.clips.length === 0) {
    logger.warn("[FFmpeg] No clips provided — creating audio-only placeholder");
    return createAudioPlaceholder(opts.audioPath, opts.outputPath);
  }

  const concatFile = path.join(TMP_DIR, `concat_${opts.reelId}.txt`);
  const concatContent = opts.clips.map((c) => `file '${c}'`).join("\n");
  fs.writeFileSync(concatFile, concatContent);

  const tempVideo = path.join(TMP_DIR, `merged_${opts.reelId}.mp4`);

  return new Promise((resolve, reject) => {
    const args = [
      "-f", "concat",
      "-safe", "0",
      "-i", concatFile,
      "-i", opts.audioPath,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-shortest",
      "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-movflags", "+faststart",
      "-y",
      opts.outputPath,
    ];

    const proc = spawn("ffmpeg", args);
    const stderr: string[] = [];

    proc.stderr.on("data", (d: Buffer) => stderr.push(d.toString()));
    proc.on("close", (code) => {
      fs.unlinkSync(concatFile);
      if (code === 0) {
        logger.info({ outputPath: opts.outputPath }, "[FFmpeg] Render complete");
        resolve(opts.outputPath);
      } else {
        logger.error({ stderr: stderr.join("") }, "[FFmpeg] Render failed");
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

async function createAudioPlaceholder(audioPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-f", "lavfi",
      "-i", "color=c=black:s=1080x1920:r=30",
      "-i", audioPath,
      "-c:v", "libx264",
      "-c:a", "aac",
      "-shortest",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args);
    proc.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error("Placeholder render failed"));
    });
  });
}

function createPlaceholder(reelId: string): string {
  ensureTmpDir();
  const p = path.join(TMP_DIR, `placeholder_${reelId}.txt`);
  fs.writeFileSync(p, `Reel ${reelId} - FFmpeg not available in this environment`);
  return p;
}

export async function downloadAndPrepareClips(
  clips: Array<{ downloadUrl: string }>,
  reelId: string,
): Promise<string[]> {
  ensureTmpDir();
  const localPaths: string[] = [];

  for (let i = 0; i < Math.min(clips.length, 3); i++) {
    const clip = clips[i]!;
    const outPath = path.join(TMP_DIR, `clip_${reelId}_${i}.mp4`);
    try {
      const res = await fetch(clip.downloadUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        fs.writeFileSync(outPath, Buffer.from(buf));
        localPaths.push(outPath);
        logger.info({ outPath }, `[FFmpeg] Clip ${i + 1} downloaded`);
      }
    } catch (e) {
      logger.warn({ e }, `[FFmpeg] Failed to download clip ${i}`);
    }
  }
  return localPaths;
}

export function cleanupTmpFiles(reelId: string): void {
  try {
    const files = fs.readdirSync(TMP_DIR);
    for (const f of files) {
      if (f.includes(reelId)) fs.unlinkSync(path.join(TMP_DIR, f));
    }
  } catch {}
}
