import { z } from "zod";
import type { Context, Settings } from "../../types";
import { CONTEXT_LABEL, systemPrompt } from "./common";
import { Question, VocabEntry } from "./listen";

export const ReadLesson = z.object({
  title: z.string(),
  kind: z.string(),
  text: z.string(),
  gloss_vi: z.string(),
  questions: z.array(Question).length(3),
  vocab: z.array(VocabEntry).min(5).max(12),
});
export type ReadLesson = z.infer<typeof ReadLesson>;

const KINDS: Record<Context, string> = {
  teaching: "a syllabus excerpt, a lecture handout paragraph, a homework notice, or a student's email asking about a grade",
  presenting: "a Korean paper abstract, a conference call-for-papers, a project progress report paragraph, or a reviewer comment",
  discussing: "a department notice, a message from a colleague in a group chat, an email from an industry partner, or meeting minutes",
};

export function readPrompt(s: Settings, context: Context) {
  const c = CONTEXT_LABEL[context];
  return {
    system: systemPrompt(s, context, s.levels.read),
    user: [
      `Write a reading exercise for the "${c.ko}" (${c.vi}) scene.`,
      `kind: pick one text type from: ${KINDS[context]}. Put the type name (in Vietnamese) in "kind".`,
      "text: 150-250 Korean words in that text type, realistic, with a title line if the type has one. Use paragraphs separated by blank lines.",
      "gloss_vi: a Vietnamese translation of the whole text.",
      "questions: 3 multiple-choice comprehension questions in Korean, 3 choices each, answer = index of the correct choice (0-2). Vary the correct index.",
      "vocab: 5-12 useful words or phrases from the text with Vietnamese meaning and the sentence they appear in.",
      "title: a short Korean title.",
    ].join("\n"),
    schema: ReadLesson,
  };
}
