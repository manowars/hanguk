import { z } from "zod";
import type { Context, Settings } from "../../types";
import { CONTEXT_LABEL, systemPrompt } from "./common";

export const Question = z.object({
  q: z.string(),
  choices: z.array(z.string()).length(3),
  answer: z.number().int().min(0).max(2),
});

export const VocabEntry = z.object({ ko: z.string(), vi: z.string(), example: z.string() });

export const ListenLesson = z.object({
  title: z.string(),
  script: z.string(),
  gloss_vi: z.string(),
  questions: z.array(Question).length(3),
  vocab: z.array(VocabEntry).min(5).max(10),
});
export type ListenLesson = z.infer<typeof ListenLesson>;

export function listenPrompt(s: Settings, context: Context) {
  const c = CONTEXT_LABEL[context];
  return {
    system: systemPrompt(s, context, s.levels.listen),
    user: [
      `Write a listening exercise for the "${c.ko}" (${c.vi}) scene.`,
      "script: 80-150 Korean words, spoken by one person (or a short two-person exchange with speaker names). It will be read aloud by text-to-speech, so use complete sentences and no bullet points.",
      "gloss_vi: a Vietnamese translation of the whole script.",
      "questions: 3 multiple-choice comprehension questions in Korean, 3 choices each, answer = index of the correct choice (0-2). Do not put the correct answer at the same index every time.",
      "vocab: 5-10 useful words or phrases from the script with Vietnamese meaning and the sentence they appear in.",
      "title: a short Korean title.",
    ].join("\n"),
    schema: ListenLesson,
  };
}
