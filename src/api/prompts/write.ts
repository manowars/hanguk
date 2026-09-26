import { z } from "zod";
import type { Context, Settings } from "../../types";
import { CONTEXT_LABEL, systemPrompt } from "./common";

export const WriteTask = z.object({
  task_vi: z.string(),
  task_ko: z.string(),
  hints: z.array(z.string()).max(5),
});
export type WriteTask = z.infer<typeof WriteTask>;

export const WriteReview = z.object({
  corrected: z.string(),
  edits: z.array(z.object({ from: z.string(), to: z.string(), why_vi: z.string() })),
  score: z.number().int().min(1).max(5),
  comment_vi: z.string(),
});
export type WriteReview = z.infer<typeof WriteReview>;

const TASKS: Record<Context, string> = {
  teaching: "an announcement to students, a reply to a student's email, a short assignment description, or a grading rubric note",
  presenting: "speaker notes for one slide, a 5-sentence talk opening, an abstract for a domestic conference, or a reply to a reviewer",
  discussing: "meeting minutes, a message to a colleague about a deadline, an email to an industry partner, or a progress update to a supervisor",
};

export function writeTaskPrompt(s: Settings, context: Context) {
  const c = CONTEXT_LABEL[context];
  return {
    system: systemPrompt(s, context, s.levels.write),
    user: [
      `Give one writing task for the "${c.ko}" (${c.vi}) scene. Pick from: ${TASKS[context]}.`,
      "task_vi: the task in Vietnamese, 1-3 sentences, with concrete details (who, what, when) from the learner's field.",
      "task_ko: the same task in Korean.",
      "hints: up to 5 Korean words or phrases that would be useful, each with a short Vietnamese gloss in parentheses.",
      "Target length for the learner: 80-150 Korean words.",
    ].join("\n"),
    schema: WriteTask,
  };
}

export function writeReviewPrompt(s: Settings, context: Context, text: string, task: string) {
  return {
    system: systemPrompt(s, context, s.levels.write),
    user: [
      `Task given to the learner: ${task}`,
      "Learner's text:",
      "<<<",
      text,
      ">>>",
      "Correct the text.",
      "corrected: the full corrected version, keeping the learner's ideas and structure. Fix grammar, particles, spacing, honorifics, and unnatural wording. Do not add new content.",
      "edits: every change you made as from/to pairs (the exact original phrase and the replacement) with why_vi = one plain Vietnamese line. Skip pure spacing fixes unless they change meaning.",
      "score: 1-5 (5 = ready to send as is).",
      "comment_vi: 2-3 sentences in Vietnamese: what was good, and the one thing to work on next.",
    ].join("\n"),
    schema: WriteReview,
  };
}
