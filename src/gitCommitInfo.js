import { execFileSync } from "node:child_process";

function runGit(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function tryRunGit(args, cwd = process.cwd()) {
  try {
    return runGit(args, cwd);
  } catch {
    return "";
  }
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

function formatCommitTooltip({ shortHash, subject, body }) {
  const cleanSubject = String(subject || "").trim();
  const cleanBody = String(body || "").trim();
  const mergeMatch = cleanSubject.match(/^Merge pull request #(\d+) from ([^\s]+)$/i);

  if (!mergeMatch) {
    return {
      branch: "",
      subject: cleanSubject,
      title: cleanSubject ? `Latest commit ${shortHash}: ${cleanSubject}` : `Latest commit ${shortHash}`
    };
  }

  const sourceRef = mergeMatch[2];
  const branch = sourceRef.includes("/") ? sourceRef.slice(sourceRef.indexOf("/") + 1) : sourceRef;
  const bodyTitle = cleanBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && line !== cleanSubject && !/^Merge pull request #\d+ from /i.test(line));
  const displaySubject = bodyTitle || `Changes from ${branch}`;

  return {
    branch,
    subject: displaySubject,
    title: `Latest update: ${displaySubject} | Branch: ${branch}`
  };
}

function isGitHubMergeSubject(subject) {
  return /^Merge pull request #\d+ from [^\s]+$/i.test(String(subject || "").trim());
}

export function createGitCommitInfo({ hash, sourceHash = "", remoteUrl, subject = "", body = "" }) {
  const commitHash = String(hash || "").trim();
  const branchCommitHash = String(sourceHash || "").trim();
  const displayHash = isGitHubMergeSubject(subject) && branchCommitHash ? branchCommitHash : commitHash;
  const url = buildCommitUrl(remoteUrl, displayHash);
  if (!commitHash || !url) return null;
  const shortHash = displayHash.slice(0, 12);
  const formatted = formatCommitTooltip({ shortHash, subject, body });
  return {
    hash: displayHash,
    mergeHash: displayHash === commitHash ? "" : commitHash,
    shortHash,
    branch: formatted.branch,
    subject: formatted.subject,
    title: formatted.title,
    url
  };
}

export function getGitCommitInfo(cwd = process.cwd()) {
  try {
    return createGitCommitInfo({
      hash: runGit(["rev-parse", "HEAD"], cwd),
      sourceHash: tryRunGit(["rev-parse", "HEAD^2"], cwd),
      remoteUrl: runGit(["remote", "get-url", "origin"], cwd),
      subject: runGit(["log", "-1", "--pretty=%s"], cwd),
      body: runGit(["log", "-1", "--pretty=%B"], cwd)
    });
  } catch {
    return null;
  }
}
