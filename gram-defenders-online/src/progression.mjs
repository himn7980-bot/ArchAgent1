const STORAGE_KEY = "gram_defenders_progress_v3";
const COOKIE_KEY = "gram_defenders_progress_v3";
const MAX_STAGE = 8;

function clampStars(value) {
  const stars = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(3, stars));
}

function normalizeProgress(value) {
  const completedStages = Array.isArray(value?.completedStages)
    ? [...new Set(value.completedStages.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STAGE))].sort((a, b) => a - b)
    : [];

  let sequentialCompleted = 0;
  for (let stage = 1; stage <= MAX_STAGE; stage += 1) {
    if (completedStages.includes(stage)) sequentialCompleted = stage;
    else break;
  }

  const validCompleted = completedStages.filter((stage) => stage <= sequentialCompleted);
  const rawStars = value?.bestStars && typeof value.bestStars === "object" ? value.bestStars : {};
  const bestStars = {};

  for (const stage of validCompleted) {
    const stars = clampStars(rawStars[stage] ?? rawStars[String(stage)] ?? 1);
    bestStars[stage] = Math.max(1, stars);
  }

  return {
    unlockedStage: Math.max(1, Math.min(MAX_STAGE, sequentialCompleted + 1)),
    completedStages: validCompleted,
    bestStars
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

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeProgress(...sources) {
  const completedStages = [];
  const bestStars = {};

  for (const source of sources.filter(Boolean)) {
    for (const stage of source.completedStages || []) completedStages.push(stage);
    const stars = source.bestStars || {};
    for (const [stage, value] of Object.entries(stars)) {
      bestStars[stage] = Math.max(bestStars[stage] || 0, clampStars(value));
    }
  }

  return normalizeProgress({ completedStages, bestStars });
}

function safeRead() {
  return mergeProgress(
    readStorage(STORAGE_KEY),
    readCookie(),
    readStorage("gram_defenders_progress_v2"),
    readStorage("gram_defenders_progress_v1")
  );
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

export function getStageBestStars(stage) {
  return safeRead().bestStars[Number(stage)] || 0;
}

export function isStageUnlocked(stage) {
  const target = Number(stage);
  if (!Number.isInteger(target) || target < 1 || target > MAX_STAGE) return false;
  return target <= safeRead().unlockedStage;
}

export function completeStage(stage, stars = 1) {
  const target = Number(stage);
  const earnedStars = clampStars(stars);
  const progress = safeRead();

  if (!Number.isInteger(target) || target < 1 || target > MAX_STAGE || earnedStars < 1) return progress;

  // Replays may improve the best star rating but cannot skip progression.
  if (progress.completedStages.includes(target)) {
    progress.bestStars[target] = Math.max(progress.bestStars[target] || 1, earnedStars);
    return safeWrite(progress);
  }

  // Only the currently unlocked stage can advance progression.
  if (target !== progress.unlockedStage) return progress;

  progress.completedStages.push(target);
  progress.bestStars[target] = Math.max(progress.bestStars[target] || 0, earnedStars);
  return safeWrite(progress);
}

export function applyCompletionFromSearch(search = "") {
  const stageMatch = String(search).match(/[?&]completed=(\d+)/);
  const starsMatch = String(search).match(/[?&]stars=(\d+)/);
  const completed = Number(stageMatch?.[1]);
  const stars = starsMatch ? Number(starsMatch[1]) : 1;
  if (Number.isInteger(completed)) return completeStage(completed, stars);
  return getProgress();
}

export function resetProgress() {
  const progress = { unlockedStage: 1, completedStages: [], bestStars: {} };
  try {
    localStorage.removeItem("gram_defenders_progress_v1");
    localStorage.removeItem("gram_defenders_progress_v2");
  } catch {}
  return safeWrite(progress);
}
