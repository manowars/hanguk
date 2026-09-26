import { z } from "zod";
import type { Context, Settings } from "../../types";
import { CONTEXT_LABEL, systemPrompt } from "./common";

export const MAX_DRAFT_CHARS = 4000;

export const RehearseScript = z.object({
  title: z.string(),
  corrections: z.array(z.object({ original: z.string(), corrected: z.string(), why_vi: z.string() })).max(15),
  segments: z
    .array(z.object({ ko: z.string(), vi: z.string(), tip_vi: z.string() }))
    .min(2)
    .max(12),
});
export type RehearseScript = z.infer<typeof RehearseScript>;

export const RehearseReview = z.object({
  overall_vi: z.string(),
  segments: z.array(
    z.object({ index: z.number().int().min(1), problem_vi: z.string(), you_said: z.string(), better_ko: z.string() }),
  ),
  pronunciation: z.array(z.object({ word: z.string(), heard: z.string(), tip_vi: z.string() })).max(6),
  delivery_vi: z.string(),
  keep: z.array(z.object({ ko: z.string(), vi: z.string(), example: z.string() })).max(5),
  score: z.number().int().min(0).max(100),
});
export type RehearseReview = z.infer<typeof RehearseReview>;

export interface Attempt {
  target: string;
  said: string;
  similarity: number;
}

/** Turns the learner's own draft (Korean, Vietnamese, English, or a mix/outline) into a corrected Korean script split into speakable chunks. */
export function rehearseScriptPrompt(s: Settings, context: Context, draft: string) {
  const c = CONTEXT_LABEL[context];
  return {
    system: systemPrompt(s, context, s.levels.speak),
    user: [
      `The professor will deliver this in the "${c.ko}" (${c.vi}) scene and wants to rehearse it aloud.`,
      "Their draft is between <draft> tags. It may be Korean with mistakes, Vietnamese, English, an outline, or a mix.",
      "<draft>",
      draft.slice(0, MAX_DRAFT_CHARS),
      "</draft>",
      "title: a short Korean title for the talk.",
      "corrections: for every mistake in the Korean parts of the draft (grammar, particles, wrong word, wrong speech level, unnatural calque from Vietnamese/English), one item: original = the learner's exact phrase, corrected = the fixed phrase, why_vi = a short Vietnamese explanation of the rule so they won't repeat it. Most important first. Empty list if the draft has no Korean or no mistakes.",
      "segments: the full talk as natural spoken Korean in the required register, keeping the learner's content and meaning. Split into chunks of 1-2 sentences that can be said in one breath (max ~30 words each). Keep technical terms from their field; use the Korean term a Korean colleague would really use.",
      "For each segment: vi = Vietnamese meaning; tip_vi = one short delivery tip (pause point, stress, tricky sound change such as 연음/비음화/경음화, or a word easy to mispronounce).",
    ].join("\n"),
    schema: RehearseScript,
  };
}

/** Reviews what speech recognition heard for each segment against the target script. */
export function rehearseReviewPrompt(s: Settings, context: Context, attempts: Attempt[]) {
  const lines = attempts.map(
    (a, i) => `${i + 1}. target: ${a.target}\n   heard: ${a.said || "(skipped)"}\n   match: ${Math.round(a.similarity * 100)}%`,
  );
  return {
    system: systemPrompt(s, context, s.levels.speak),
    user: [
      "The professor rehearsed their talk aloud. Speech recognition (Korean) transcribed each chunk. Compare what was heard with the target.",
      "Remember: when the recognizer hears a different but similar-sounding word, that usually means a pronunciation problem; missing endings or particles often mean the learner dropped or mumbled them.",
      lines.join("\n"),
      "overall_vi: 2-3 sentences in Vietnamese: the main strengths and the single most important thing to fix next time.",
      "segments: only chunks with a real problem (skip good ones). index = chunk number, problem_vi = what went wrong in Vietnamese, you_said = the heard phrase, better_ko = what to say.",
      "pronunciation: up to 6 words that were likely mispronounced. word = target word, heard = what the recognizer heard, tip_vi = how to say it (sound change rule, mouth position, syllable stress), in Vietnamese. Vietnamese speakers often struggle with ㅓ/ㅗ, ㅡ/ㅜ, 받침 ㄹ/ㄴ/ㅇ, aspirated vs tense consonants (ㅂ/ㅍ/ㅃ, ㄷ/ㅌ/ㄸ, ㅈ/ㅊ/ㅉ) — mention these when relevant.",
      "delivery_vi: 1-2 sentences in Vietnamese on speech level consistency and presentation delivery (signposting like 먼저/다음으로/정리하자면, pacing).",
      "keep: up to 5 useful expressions from the script worth memorizing (ko, Vietnamese meaning, a short example sentence).",
      "score: 0-100 for how ready this talk is to deliver, at the learner's level.",
    ].join("\n"),
    schema: RehearseReview,
  };
}
