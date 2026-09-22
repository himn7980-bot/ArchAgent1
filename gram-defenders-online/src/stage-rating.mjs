export const STAGE_RATING = Object.freeze({
  maxLeaks: 10,
  twoStarMaxLeaks: 5
});

export function getStageStars(leaks) {
  const escaped = Math.max(0, Number(leaks) || 0);
  if (escaped >= STAGE_RATING.maxLeaks) return 0;
  if (escaped === 0) return 3;
  if (escaped <= STAGE_RATING.twoStarMaxLeaks) return 2;
  return 1;
}

export function formatStars(stars) {
  const value = Math.max(0, Math.min(3, Number(stars) || 0));
  return "★".repeat(value) + "☆".repeat(3 - value);
}
