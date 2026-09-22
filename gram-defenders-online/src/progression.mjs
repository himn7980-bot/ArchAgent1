const STORAGE_KEY = "gram_defenders_progress_v4";
const COOKIE_KEY = "gram_defenders_progress_v4";
const MAX_STAGE = 8;
const REQUIRED_UNLOCK_STARS = 3;

function clampStars(value) {
  const stars = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(3, stars));
}

function sequentialPerfectClears(completedStages) {
  const unique = [...new Set((completedStages || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STAGE))].sort((a, b) => a - b);
  let sequential = 0;
  for (let stage = 1; stage <= MAX_STAGE; stage += 1) {
    if (unique.includes(stage)) sequential = stage;
    else break;
  }
  return unique.filter((stage) => stage <= sequential);
}

function normalizeProgress(value) {
  const completedStages = sequentialPerfectClears(value?.completedStages);
  const unlockedStage = Math.max(1, Math.min(MAX_STAGE, completedStages.length + 1));
  const rawStars = value?.bestStars && typeof value.bestStars === "object" ? value.bestStars : {};
  const bestStars = {};

  for (let stage = 1; stage <= unlockedStage; stage += 1) {
    const stars = clampStars(rawStars[stage] ?? rawStars[String(stage)] ?? 0);
    if (stars > 0) bestStars[stage] = stars;
  }

  // A stage recorded as a perfect clear must always retain three stars.
  for (const stage of completedStages) bestStars[stage] = REQUIRED_UNLOCK_STARS;

  return { unlockedStage, completedStages, bestStars };
}

function readCookie(key = COOKIE_KEY) {
  if (typeof document === "undefined") return null;
  try {
    const prefix = key + "=";
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

function migrateLegacy(source) {
  if (!source) return null;
  const completedStages = sequentialPerfectClears(source.completedStages);
  const bestStars = { ...(source.bestStars || {}) };

  // Before v1.13, any successful clear unlocked the next stage.
  // Grandfather those already-unlocked clears as 3-star so existing players are not relocked.
  for (const stage of completedStages) bestStars[stage] = REQUIRED_UNLOCK_STARS;

  return { completedStages, bestStars };
}

function mergeProgress(...sources) {
  const completedStages = [];
  const bestStars = {};

  for (const source of sources.filter(Boolean)) {
    for (const stage of source.completedStages || []) completedStages.push(stage);
    for (const [stage, value] of Object.entries(source.bestStars || {})) {
      bestStars[stage] = Math.max(bestStars[stage] || 0, clampStars(value));
    }
  }

  return normalizeProgress({ completedStages, bestStars });
}

function safeRead() {
  const currentLocal = readStorage(STORAGE_KEY);
  const currentCookie = readCookie();
  const legacy = [
    migrateLegacy(readStorage("gram_defenders_progress_v3")),
    migrateLegacy(readStorage("gram_defenders_progress_v2")),
    migrateLegacy(readStorage("gram_defenders_progress_v1"))
  ];

  return mergeProgress(currentLocal, currentCookie, ...legacy);
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

export function completeStage(stage, stars = 0) {
  const target = Number(stage);
  const earnedStars = clampStars(stars);
  const progress = safeRead();

  if (!Number.isInteger(target) || target < 1 || target > MAX_STAGE || earnedStars < 1) return progress;
  if (target > progress.unlockedStage) return progress;

  // Always preserve the best result for an unlocked/replayable stage.
  progress.bestStars[target] = Math.max(progress.bestStars[target] || 0, earnedStars);

  // Replaying a previously perfect-cleared stage can improve nothing beyond 3★,
  // but it must never disturb sequential progression.
  if (progress.completedStages.includes(target)) return safeWrite(progress);

  // Only a perfect 3★ clear unlocks the next stage.
  if (target === progress.unlockedStage && earnedStars === REQUIRED_UNLOCK_STARS) {
    progress.completedStages.push(target);
  }

  return safeWrite(progress);
}

export function applyCompletionFromSearch(search = "") {
  const stageMatch = String(search).match(/[?&]completed=(\d+)/);
  const starsMatch = String(search).match(/[?&]stars=(\d+)/);
  const completed = Number(stageMatch?.[1]);
  const stars = starsMatch ? Number(starsMatch[1]) : 0;
  if (Number.isInteger(completed)) return completeStage(completed, stars);
  return getProgress();
}

export function resetProgress() {
  const progress = { unlockedStage: 1, completedStages: [], bestStars: {} };
  try {
    for (const key of ["gram_defenders_progress_v1","gram_defenders_progress_v2","gram_defenders_progress_v3"]) {
      localStorage.removeItem(key);
    }
  } catch {}
  return safeWrite(progress);
}
