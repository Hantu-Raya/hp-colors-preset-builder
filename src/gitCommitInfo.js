import { execFileSync } from "node:child_process";

function runGit(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

export function buildCommitUrl(remoteUrl, hash) {
  const commitHash = String(hash || "").trim();
  if (!commitHash) return null;

  const remote = String(remoteUrl || "").trim();
  const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}/commit/${commitHash}`;

  const sshMatch = remote.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (sshMatch) return `https://github.com/${sshMatch[1]}/commit/${commitHash}`;

  return null;
}

export function createGitCommitInfo({ hash, remoteUrl, subject = "" }) {
  const commitHash = String(hash || "").trim();
  const url = buildCommitUrl(remoteUrl, commitHash);
  if (!commitHash || !url) return null;
  const shortHash = commitHash.slice(0, 12);
  const cleanSubject = String(subject || "").trim();
  return {
    hash: commitHash,
    shortHash,
    subject: cleanSubject,
    title: cleanSubject ? `Latest commit ${shortHash}: ${cleanSubject}` : `Latest commit ${shortHash}`,
    url
  };
}

export function getGitCommitInfo(cwd = process.cwd()) {
  try {
    return createGitCommitInfo({
      hash: runGit(["rev-parse", "HEAD"], cwd),
      remoteUrl: runGit(["remote", "get-url", "origin"], cwd),
      subject: runGit(["log", "-1", "--pretty=%s"], cwd)
    });
  } catch {
    return null;
  }
}
