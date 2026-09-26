import type Anthropic from "@anthropic-ai/sdk";
import { chat } from "../../api/claude";
import {
  RoleplayFeedback,
  RoleplayTurn,
  ShadowSet,
  roleplayFeedbackPrompt,
  roleplayStart,
  shadowPrompt,
} from "../../api/prompts/speak";
import type { Context, Settings } from "../../types";

/** Generates 6 shadowing sentences for the given context. */
export async function startShadow(settings: Settings, context: Context): Promise<ShadowSet> {
  const { system, user, schema } = shadowPrompt(settings, context);
  return chat({ system, messages: [{ role: "user", content: user }], schema, settings });
}

export interface RoleplaySession {
  system: string;
  messages: Anthropic.MessageParam[];
  first: RoleplayTurn;
}

/** Opens a roleplay: sends the opening line, returns the system prompt, history and Claude's first reply. */
export async function startRoleplay(settings: Settings, context: Context): Promise<RoleplaySession> {
  const { system, openingUser } = roleplayStart(settings, context);
  const opening: Anthropic.MessageParam[] = [{ role: "user", content: openingUser }];
  const first = await chat({ system, messages: opening, schema: RoleplayTurn, settings });
  const messages: Anthropic.MessageParam[] = [...opening, { role: "assistant", content: JSON.stringify(first) }];
  return { system, messages, first };
}

export interface RoleplayReply {
  messages: Anthropic.MessageParam[];
  turn: RoleplayTurn;
}

/** Sends the learner's recognized speech, returns the updated history and Claude's reply. */
export async function roleplayReply(
  settings: Settings,
  system: string,
  messages: Anthropic.MessageParam[],
  userText: string,
): Promise<RoleplayReply> {
  const withUser: Anthropic.MessageParam[] = [...messages, { role: "user", content: userText }];
  const turn = await chat({ system, messages: withUser, schema: RoleplayTurn, settings });
  const next: Anthropic.MessageParam[] = [...withUser, { role: "assistant", content: JSON.stringify(turn) }];
  return { messages: next, turn };
}

/** Ends the roleplay and asks Claude to grade the learner's turns. */
export async function roleplayFeedback(
  settings: Settings,
  system: string,
  messages: Anthropic.MessageParam[],
): Promise<RoleplayFeedback> {
  const withPrompt: Anthropic.MessageParam[] = [...messages, { role: "user", content: roleplayFeedbackPrompt() }];
  return chat({ system, messages: withPrompt, schema: RoleplayFeedback, settings });
}
