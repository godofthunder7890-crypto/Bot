import { logger } from "../lib/logger";
import { memoryStore } from "../storage/memory";

const PROJECT_ID = process.env["FIREBASE_PROJECT_ID"] ?? "intro-7444d";
const STORAGE_BUCKET = process.env["FIREBASE_STORAGE_BUCKET"] ?? "intro-7444d.firebasestorage.app";

function getApiKey(): string {
  return process.env["FIREBASE_API_KEY"] ?? "";
}

export async function uploadToFirebaseStorage(
  filePath: string,
  fileName: string,
  mimeType: string = "video/mp4",
): Promise<string> {
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString("base64");

  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=reels/${fileName}&key=${getApiKey()}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase upload failed: ${text}`);
  }

  const data = await response.json() as { name: string };
  const encodedName = encodeURIComponent(data.name);
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedName}?alt=media&token=public`;

  memoryStore.incApi("firebase");
  logger.info({ fileName }, "[Firebase] Uploaded successfully");
  return downloadUrl;
}

export async function uploadVoiceToFirebase(filePath: string, fileName: string): Promise<string> {
  return uploadToFirebaseStorage(filePath, `voice/${fileName}`, "audio/mpeg");
}

export async function deleteFromFirebase(fileName: string): Promise<void> {
  const encodedName = encodeURIComponent(`reels/${fileName}`);
  const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedName}?key=${getApiKey()}`;
  await fetch(url, { method: "DELETE" });
}

export function getFirebasePublicUrl(fileName: string): string {
  const encodedName = encodeURIComponent(`reels/${fileName}`);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedName}?alt=media`;
}

export { PROJECT_ID, STORAGE_BUCKET };
