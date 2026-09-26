import { z } from "zod";
import type { Context, Settings } from "../../types";
import { CONTEXT_LABEL, systemPrompt } from "./common";

export const ShadowSet = z.object({
  sentences: z.array(z.object({ ko: z.string(), vi: z.string() })).length(6),
});
export type ShadowSet = z.infer<typeof ShadowSet>;

export const RoleplayTurn = z.object({
  reply_ko: z.string(),
  reply_vi: z.string(),
  done: z.boolean(),
});
export type RoleplayTurn = z.infer<typeof RoleplayTurn>;

export const RoleplayFeedback = z.object({
  honorific: z.string(),
  naturalness: z.string(),
  better: z.array(z.object({ you_said: z.string(), better: z.string(), why_vi: z.string() })).length(3),
  score: z.number().int().min(0).max(100),
});
export type RoleplayFeedback = z.infer<typeof RoleplayFeedback>;

export function shadowPrompt(s: Settings, context: Context) {
  const c = CONTEXT_LABEL[context];
  return {
    system: systemPrompt(s, context, s.levels.speak),
    user: [
      `Give 6 Korean sentences the professor would actually say in the "${c.ko}" (${c.vi}) scene, for shadowing practice.`,
      "Each sentence: 8-20 words, one idea, natural spoken rhythm. Order them from easier to harder.",
      "vi: Vietnamese meaning of each sentence.",
    ].join("\n"),
    schema: ShadowSet,
  };
}

const PARTNER: Record<Context, string> = {
  teaching: "a graduate student (대학원생) who asks questions about the lecture content, sometimes confused, always polite",
  presenting: "an audience member or reviewer (질문자) who asks pointed questions after the professor's talk",
  discussing: "a colleague (동료 교수 or 연구원) discussing an ongoing project, deadlines, and results in a lab meeting",
};

export function roleplayStart(s: Settings, context: Context) {
  const c = CONTEXT_LABEL[context];
  const system = [
    systemPrompt(s, context, s.levels.speak),
    "",
    `ROLEPLAY MODE. You play ${PARTNER[context]}. The learner plays the professor.`,
    "Each turn: reply in Korean in 1-3 sentences (reply_ko), give a Vietnamese translation (reply_vi), and keep the conversation going with a question or a new point.",
    "Stay in character; do not correct the learner during the conversation. If the learner's Korean is unclear, react naturally as a Korean speaker would (ask them to repeat or clarify).",
    "Set done=true only after at least 5 exchanges when the conversation reached a natural close.",
    `Scene: ${c.scene}.`,
  ].join("\n");
  return {
    system,
    openingUser: "Start the roleplay. Greet the professor briefly and open with your first question or remark about the scene.",
  };
}

export function roleplayFeedbackPrompt(): string {
  return [
    "The roleplay is over. Leave character and evaluate ONLY the professor's (the learner's) Korean turns in this conversation.",
    "honorific: 2-3 sentences in Vietnamese about the speech level and honorifics used (합니다체/해요체, 반말 slips, wrong honorific verbs).",
    "naturalness: 2-3 sentences in Vietnamese about word choice, sentence flow, and anything that sounded translated from Vietnamese or English.",
    "better: exactly 3 items. you_said = a phrase the learner actually said; better = a more natural Korean version; why_vi = one line in Vietnamese.",
    "score: 0-100 for overall communicative success at the learner's level.",
  ].join("\n");
}
