import { Octokit } from "@octokit/rest";
import { secrets } from "../security/secretManager";
import { memoryStore } from "../storage/memory";
import { logger } from "../lib/logger";

let _octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (!_octokit) _octokit = new Octokit({ auth: secrets.get("GITHUB_TOKEN") });
  return _octokit;
}

function parseRepo(): { owner: string; repo: string } {
  const raw = secrets.get("GITHUB_REPO");
  const parts = raw.replace("https://github.com/", "").split("/");
  return { owner: parts[0]!, repo: parts[1]! };
}

export async function pushFileToGitHub(
  filePath: string,
  content: string,
  commitMessage: string,
): Promise<string> {
  const octokit = getOctokit();
  const { owner, repo } = parseRepo();
  const encoded = Buffer.from(content).toString("base64");

  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path: filePath });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      sha = existing.data.sha;
    }
  } catch {}

  const result = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: commitMessage,
    content: encoded,
    ...(sha ? { sha } : {}),
  });

  const commitSha = result.data.commit.sha ?? "unknown";
  memoryStore.update({ githubLastCommit: commitSha, githubLastCommitAt: new Date().toISOString() });
  logger.info({ filePath, commitSha }, "[GitHub] Pushed file");
  return commitSha;
}

export async function syncMemoryToGitHub(): Promise<void> {
  try {
    const mem = memoryStore.get();
    await pushFileToGitHub(
      "AGENT_MEMORY.json",
      JSON.stringify(mem, null, 2),
      `chore: sync agent memory [${new Date().toISOString()}]`,
    );
    logger.info("[GitHub] Memory synced");
  } catch (e) {
    logger.error({ e }, "[GitHub] Memory sync failed");
  }
}

export async function pushAgentHandoff(): Promise<void> {
  try {
    const fs = await import("fs");
    const content = fs.existsSync("AGENT_HANDOFF.md")
      ? fs.readFileSync("AGENT_HANDOFF.md", "utf8")
      : "# Agent Handoff\n_Not generated yet_";
    await pushFileToGitHub(
      "AGENT_HANDOFF.md",
      content,
      "docs: update agent handoff guide",
    );
  } catch (e) {
    logger.error({ e }, "[GitHub] Handoff push failed");
  }
}

export async function autoCommitCode(message: string): Promise<void> {
  try {
    const mem = memoryStore.get();
    const summary = `## System State\n- Version: ${mem.systemVersion}\n- Completed Reels: ${mem.completedReels}\n- Last Step: ${mem.lastExecutedStep}\n- API Usage: ${JSON.stringify(mem.apiUsage)}`;
    await pushFileToGitHub("SYSTEM_STATE.md", summary, message);
    logger.info("[GitHub] Auto-commit done");
  } catch (e) {
    logger.error({ e }, "[GitHub] Auto-commit failed");
  }
}
