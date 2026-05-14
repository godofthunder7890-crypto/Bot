import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";

const BASE_URL = "https://pixabay.com/api/videos/";

export interface PixabayClip {
  id: number;
  pageURL: string;
  duration: number;
  downloadUrl: string;
  source: "pixabay";
}

export async function searchPixabayVideos(
  query: string,
  count: number = 5,
): Promise<PixabayClip[]> {
  const apiKey = secrets.get("PIXABAY_API_KEY");
  const url = `${BASE_URL}?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${count}&video_type=film`;

  const res = await fetch(url);
  if (!res.ok) {
    logger.warn({ status: res.status }, "[Pixabay] Search failed");
    return [];
  }

  const data = await res.json() as {
    hits: Array<{
      id: number;
      pageURL: string;
      duration: number;
      videos: {
        medium?: { url: string };
        large?: { url: string };
        small?: { url: string };
      };
    }>;
  };

  memoryStore.incApi("pixabay");

  return (data.hits ?? []).map((h) => ({
    id: h.id,
    pageURL: h.pageURL,
    duration: h.duration,
    downloadUrl: h.videos.large?.url ?? h.videos.medium?.url ?? h.videos.small?.url ?? "",
    source: "pixabay" as const,
  })).filter((c) => c.downloadUrl !== "");
}
