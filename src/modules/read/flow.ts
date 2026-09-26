import { chat } from "../../api/claude";
import { readPrompt } from "../../api/prompts/read";
import type { ReadLesson } from "../../api/prompts/read";
import type { Context, Settings } from "../../types";

/** Fetches a new reading lesson from Claude for the given context. */
export async function startRead(settings: Settings, context: Context): Promise<ReadLesson> {
  const { system, user, schema } = readPrompt(settings, context);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

/** Percent of questions answered correctly (0-100). Pure. */
export function scoreRead(lesson: ReadLesson, answers: (number | null)[]): number {
  const total = lesson.questions.length;
  if (total === 0) return 0;
  const correct = lesson.questions.filter((q, i) => answers[i] === q.answer).length;
  return Math.round((correct / total) * 100);
}
