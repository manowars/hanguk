export type Context = "teaching" | "presenting" | "discussing";
export type Skill = "listen" | "speak" | "read" | "write";

export const CONTEXTS: Context[] = ["teaching", "presenting", "discussing"];
export const SKILLS: Skill[] = ["listen", "speak", "read", "write"];

export interface Settings {
  apiKey: string;
  model: string;
  ttsRate: number;
  field: string;
  levels: Record<Skill, number>;
  history: Record<Skill, number[]>;
}

export interface Card {
  id: string;
  ko: string;
  vi: string;
  example: string;
  context: Context;
  ease: number;
  interval: number;
  reps: number;
  due: number;
}

export interface LessonResult {
  id: string;
  skill: Skill;
  context: Context;
  score: number;
  date: number;
}

export interface VocabItem {
  ko: string;
  vi: string;
  example: string;
}
