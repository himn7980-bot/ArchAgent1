const STORAGE_KEY = "gram_defenders_progress_v1";
const MAX_STAGE = 8;

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlockedStage: 1, completedStages: [] };
    const parsed = JSON.parse(raw);
    return {
      unlockedStage: Math.max(1, Math.min(MAX_STAGE, Number(parsed.unlockedStage) || 1)),
      completedStages: Array.isArray(parsed.completedStages)
        ? parsed.completedStages.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STAGE)
        : []
    };
  } catch {
    return { unlockedStage: 1, completedStages: [] };
  }
}

function safeWrite(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
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

export function resetProgress() {
  const progress = { unlockedStage: 1, completedStages: [] };
  safeWrite(progress);
  return progress;
}
