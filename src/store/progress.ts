import type { Context, Settings, Skill, VocabItem } from "../types";
import { saveLesson, saveCard, hasCard } from "./db";
import { nextLevel, pushScore } from "./level";
import { newCard } from "./srs";
import { saveSettings } from "./settings";

/** Records a finished lesson (score 0..100), updates the skill level, persists settings. Returns the new settings. */
export async function finishLesson(s: Settings, skill: Skill, context: Context, score: number): Promise<Settings> {
  const rounded = Math.round(Math.max(0, Math.min(100, score)));
  const history = pushScore(s.history[skill], rounded);
  const level = nextLevel(s.levels[skill], history);
  const next: Settings = {
    ...s,
    history: { ...s.history, [skill]: history },
    levels: { ...s.levels, [skill]: level },
  };
  saveSettings(next);
  await saveLesson({ id: `${Date.now()}-${skill}`, skill, context, score: rounded, date: Date.now() });
  return next;
}

/** Saves a vocab item as a new SRS card unless one with the same Korean already exists. Returns true when saved. */
export async function saveVocab(item: VocabItem, context: Context): Promise<boolean> {
  if (await hasCard(item.ko)) return false;
  await saveCard(newCard({ ...item, context }, Date.now()));
  return true;
}
