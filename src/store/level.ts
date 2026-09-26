const WINDOW = 10;
const THRESHOLD = 85;
const MAX_LEVEL = 6;

/** Keep only the last WINDOW scores. Returns a new array. */
export function pushScore(history: number[], score: number): number[] {
  return [...history, score].slice(-WINDOW);
}

/** Level goes up by one when the last WINDOW scores average above THRESHOLD. */
export function nextLevel(level: number, history: number[]): number {
  if (history.length < WINDOW || level >= MAX_LEVEL) return level;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  return mean > THRESHOLD ? level + 1 : level;
}
