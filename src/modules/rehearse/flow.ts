import { chat } from "../../api/claude";
import {
  rehearseReviewPrompt,
  rehearseScriptPrompt,
  type Attempt,
  type RehearseReview,
  type RehearseScript,
} from "../../api/prompts/rehearse";
import type { Context, Settings } from "../../types";

/** Corrects the learner's draft and splits it into speakable Korean chunks. */
export async function buildScript(settings: Settings, context: Context, draft: string): Promise<RehearseScript> {
  const { system, user, schema } = rehearseScriptPrompt(settings, context, draft);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

/** Grades the recognized speech for every chunk. */
export async function reviewRehearsal(settings: Settings, context: Context, attempts: Attempt[]): Promise<RehearseReview> {
  const { system, user, schema } = rehearseReviewPrompt(settings, context, attempts);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}
