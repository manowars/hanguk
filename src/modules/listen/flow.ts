import { chat } from "../../api/claude";
import { listenPrompt, type ListenLesson } from "../../api/prompts/listen";
import type { Context, Settings } from "../../types";

/** Calls Claude for a new listening lesson grounded in the given context. */
export function startListen(settings: Settings, context: Context): Promise<ListenLesson> {
  const { system, user, schema } = listenPrompt(settings, context);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

/** Percent of questions answered correctly (0-100). An unanswered question (null) counts as wrong. */
export function scoreListen(lesson: ListenLesson, answers: (number | null)[]): number {
  const correct = lesson.questions.filter((q, i) => answers[i] === q.answer).length;
  return Math.round((correct / lesson.questions.length) * 100);
}
