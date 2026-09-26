import { chat } from "../../api/claude";
import { writeTaskPrompt, writeReviewPrompt, type WriteTask, type WriteReview } from "../../api/prompts/write";
import type { Context, Settings } from "../../types";

export async function getTask(settings: Settings, context: Context): Promise<WriteTask> {
  const { system, user, schema } = writeTaskPrompt(settings, context);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

export async function reviewText(settings: Settings, context: Context, task: WriteTask, text: string): Promise<WriteReview> {
  const { system, user, schema } = writeReviewPrompt(settings, context, text, task.task_vi);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

/** Counts whitespace-separated tokens. Pure. */
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
