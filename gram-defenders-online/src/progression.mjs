const STORAGE_KEY = "gram_defenders_progress_v2";
const COOKIE_KEY = "gram_defenders_progress_v2";
const MAX_STAGE = 8;

function normalizeProgress(value) {
  const completedStages = Array.isArray(value?.completedStages)
    ? [...new Set(value.completedStages.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STAGE))].sort((a, b) => a - b)
    : [];

  let sequentialCompleted = 0;
  for (let stage = 1; stage <= MAX_STAGE; stage += 1) {
    if (completedStages.includes(stage)) sequentialCompleted = stage;
    else break;
  }

  const unlockedStage = Math.min(MAX_STAGE, sequentialCompleted + 1);
  return {
    unlockedStage: Math.max(1, unlockedStage),
    completedStages: completedStages.filter((stage) => stage <= sequentialCompleted)
  };
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

function readLegacyProgress() {
  let local = null;
  try {
    const raw = localStorage.getItem("gram_defenders_progress_v1");
    if (raw) local = JSON.parse(raw);
  } catch {}
  return local;
}

function safeRead() {
  let local = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch {}

  const cookie = readCookie();
  const legacy = readLegacyProgress();
  const mergedCompleted = [
    ...(local?.completedStages || []),
    ...(cookie?.completedStages || []),
    ...(legacy?.completedStages || [])
  ];
  return normalizeProgress({ completedStages: mergedCompleted });
}

function safeWrite(progress) {
  const normalized = normalizeProgress(progress);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  if (typeof document !== "undefined") {
    try {
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(normalized))}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  }
  return normalized;
}

export function getProgress() {
  return safeRead();
}

export function isStageUnlocked(stage) {
  const target = Number(stage);
  if (!Number.isInteger(target) || target < 1 || target > MAX_STAGE) return false;
  return target <= safeRead().unlockedStage;
}

export function completeStage(stage) {
  const target = Number(stage);
  const progress = safeRead();

  if (!Number.isInteger(target) || target < 1 || target > MAX_STAGE) return progress;

  // Strict sequential progression: only the currently unlocked stage can advance progress.
  if (target !== progress.unlockedStage) {
    // Replaying an already-cleared stage is allowed but does not change progression.
    return progress;
  }

  progress.completedStages.push(target);
  return safeWrite(progress);
}

export function applyCompletionFromSearch(search = "") {
  const match = String(search).match(/[?&]completed=(\d+)/);
  const completed = Number(match?.[1]);
  if (Number.isInteger(completed)) return completeStage(completed);
  return getProgress();
}

export function resetProgress() {
  const progress = { unlockedStage: 1, completedStages: [] };
  try { localStorage.removeItem("gram_defenders_progress_v1"); } catch {}
  return safeWrite(progress);
}
