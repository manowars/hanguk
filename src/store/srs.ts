import type { Card } from "../types";

const DAY = 86400000;
const MIN_EASE = 1.3;
const START_EASE = 2.5;

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function newCard(p: Pick<Card, "ko" | "vi" | "example" | "context">, now: number): Card {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    ko: p.ko,
    vi: p.vi,
    example: p.example,
    context: p.context,
    ease: START_EASE,
    interval: 0,
    reps: 0,
    due: now,
  };
}

/** SM-2. Returns a new card; never mutates the input. */
export function review(card: Card, quality: Quality, now: number): Card {
  if (quality < 3) {
    return { ...card, reps: 0, interval: 1, due: now + DAY };
  }
  const reps = card.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(card.interval * card.ease);
  const penalty = 5 - quality;
  const ease = Math.max(MIN_EASE, card.ease + 0.1 - penalty * (0.08 + penalty * 0.02));
  return { ...card, reps, interval, ease, due: now + interval * DAY };
}
