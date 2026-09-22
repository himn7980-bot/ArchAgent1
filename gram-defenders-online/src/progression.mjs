const STORAGE_KEY = "gram_defenders_progress_v1";
const COOKIE_KEY = "gram_defenders_progress_v1";
const MAX_STAGE = 8;

function normalizeProgress(value) {
  const unlockedStage = Math.max(1, Math.min(MAX_STAGE, Number(value?.unlockedStage) || 1));
  const completedStages = Array.isArray(value?.completedStages)
    ? value.completedStages.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STAGE)
    : [];
  return { unlockedStage, completedStages: [...new Set(completedStages)].sort((a, b) => a - b) };
}

function readCookie() {
  if (typeof document === "undefined") return null;
  try {
    const prefix = COOKIE_KEY + "=";
    const raw = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw.slice(prefix.length)));
  } catch {
    return null;
  }
}

function safeRead() {
  let local = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch {}

  const cookie = readCookie();
  const a = normalizeProgress(local || {});
  const b = normalizeProgress(cookie || {});
  return {
    unlockedStage: Math.max(a.unlockedStage, b.unlockedStage),
    completedStages: [...new Set([...a.completedStages, ...b.completedStages])].sort((x, y) => x - y)
  };
}

function safeWrite(progress) {
  const normalized = normalizeProgress(progress);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  if (typeof document !== "undefined") {
    try {
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(normalized))}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  }
}

export function getProgress() {
  return safeRead();
}

export function isStageUnlocked(stage) {
  return stage <= safeRead().unlockedStage;
}

export function completeStage(stage) {
  const progress = safeRead();
  if (!progress.completedStages.includes(stage)) progress.completedStages.push(stage);
  progress.completedStages.sort((a, b) => a - b);
  progress.unlockedStage = Math.max(progress.unlockedStage, Math.min(MAX_STAGE, stage + 1));
  safeWrite(progress);
  return progress;
}

export function applyCompletionFromSearch(search = "") {
  const match = String(search).match(/[?&]completed=(\d+)/);
  const completed = Number(match?.[1]);
  if (Number.isInteger(completed) && completed >= 1 && completed < MAX_STAGE) {
    return completeStage(completed);
  }
  return getProgress();
}

export function resetProgress() {
  const progress = { unlockedStage: 1, completedStages: [] };
  safeWrite(progress);
  return progress;
}
