import type { Context, Settings } from "../../types";

export const CONTEXT_LABEL: Record<Context, { vi: string; ko: string; scene: string; register: string }> = {
  teaching: {
    vi: "Giảng dạy",
    ko: "강의",
    scene: "a university lecture or lab class where the professor explains concepts to graduate students",
    register: "합니다체 (formal polite), clear and structured, like a lecturer",
  },
  presenting: {
    vi: "Thuyết trình",
    ko: "발표",
    scene: "a conference talk, seminar or project review where the professor presents research results and answers questions",
    register: "합니다체 (formal polite), concise academic presentation style",
  },
  discussing: {
    vi: "Thảo luận công việc",
    ko: "업무 토론",
    scene: "a lab meeting, a chat with a colleague, or a discussion with industry partners about ongoing work",
    register: "해요체 (polite informal) mixed with 합니다체 when addressing seniors; natural spoken Korean",
  },
};

export function systemPrompt(s: Settings, context: Context, level: number): string {
  const c = CONTEXT_LABEL[context];
  return [
    "You are a Korean language coach for a Vietnamese professor working at a Korean university.",
    `Learner profile: field is ${s.field}. Current level: TOPIK ${level}.`,
    `Scene for this lesson: ${c.scene}.`,
    `Speech register: ${c.register}.`,
    "Content rules:",
    "- All Korean is natural, modern, and correct. Use real academic and workplace vocabulary from the learner's field.",
    `- Difficulty matches TOPIK ${level}: at 3-4 keep sentences short and common; at 5-6 use longer sentences, connective endings and technical terms.`,
    "- Glosses and explanations are in Vietnamese, short and plain.",
    "- Never include romanization.",
    "- Return only the requested fields.",
  ].join("\n");
}
