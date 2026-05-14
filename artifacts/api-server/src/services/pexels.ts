import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";

const BASE_URL = "https://api.pexels.com/videos";

export interface VideoClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  downloadUrl: string;
  source: "pexels" | "pixabay";
}

export async function searchPexelsVideos(
  query: string,
  count: number = 5,
): Promise<VideoClip[]> {
  const apiKey = secrets.get("PEXELS_API_KEY");

  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`,
    { headers: { Authorization: apiKey } },
  );

  if (!res.ok) {
    logger.warn({ status: res.status }, "[Pexels] Search failed");
    return [];
  }

  const data = await res.json() as {
    videos: Array<{
      id: number;
      url: string;
      width: number;
      height: number;
      duration: number;
      video_files: Array<{ link: string; quality: string; width: number; height: number }>;
    }>;
  };

  memoryStore.incApi("pexels");

  return (data.videos ?? []).map((v) => {
    const hdFile = v.video_files.find((f) => f.quality === "hd") ?? v.video_files[0];
    return {
      id: v.id,
      url: v.url,
      width: v.width,
      height: v.height,
      duration: v.duration,
      downloadUrl: hdFile?.link ?? "",
      source: "pexels" as const,
    };
  }).filter((v) => v.downloadUrl !== "");
}

export async function downloadVideoClip(url: string, outputPath: string): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  logger.info({ outputPath }, "[Pexels] Clip downloaded");
  return outputPath;
}
