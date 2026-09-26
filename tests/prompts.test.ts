import { expect, test } from "vitest";
import { defaultSettings } from "../src/store/settings";
import { systemPrompt, CONTEXT_LABEL } from "../src/api/prompts/common";
import { listenPrompt, ListenLesson } from "../src/api/prompts/listen";
import { readPrompt, ReadLesson } from "../src/api/prompts/read";
import { shadowPrompt, roleplayStart, roleplayFeedbackPrompt, RoleplayTurn } from "../src/api/prompts/speak";
import { writeTaskPrompt, writeReviewPrompt, WriteReview } from "../src/api/prompts/write";

const s = { ...defaultSettings(), levels: { listen: 4, speak: 3, read: 5, write: 3 } };

test("system prompt carries level, field and context scene", () => {
  const sys = systemPrompt(s, "presenting", 4);
  expect(sys).toContain("TOPIK 4");
  expect(sys).toContain("fluid");
  expect(sys).toContain(CONTEXT_LABEL.presenting.scene);
});

test("listen prompt uses the listen level", () => {
  const p = listenPrompt(s, "presenting");
  expect(p.system).toContain("TOPIK 4");
  expect(p.user).toMatch(/발표|presentation/);
  expect(p.schema).toBe(ListenLesson);
});

test("read prompt uses the read level", () => {
  const p = readPrompt(s, "teaching");
  expect(p.system).toContain("TOPIK 5");
  expect(p.schema).toBe(ReadLesson);
});

test("ListenLesson rejects wrong answer index", () => {
  const bad = {
    title: "t",
    script: "s",
    gloss_vi: "g",
    vocab: Array(5).fill({ ko: "a", vi: "b", example: "c" }),
    questions: Array(3).fill({ q: "q", choices: ["a", "b", "c"], answer: 3 }),
  };
  expect(ListenLesson.safeParse(bad).success).toBe(false);
});

test("ListenLesson accepts a valid lesson", () => {
  const good = {
    title: "t",
    script: "s",
    gloss_vi: "g",
    vocab: Array(5).fill({ ko: "a", vi: "b", example: "c" }),
    questions: Array(3).fill({ q: "q", choices: ["a", "b", "c"], answer: 1 }),
  };
  expect(ListenLesson.safeParse(good).success).toBe(true);
});

test("shadow prompt asks for six sentences", () => {
  const p = shadowPrompt(s, "teaching");
  expect(p.user).toMatch(/6/);
});

test("roleplay start names a partner role for the context", () => {
  const p = roleplayStart(s, "discussing");
  expect(p.system).toMatch(/colleague|동료/i);
  expect(p.openingUser.length).toBeGreaterThan(0);
});

test("RoleplayTurn requires done flag", () => {
  expect(RoleplayTurn.safeParse({ reply_ko: "a", reply_vi: "b" }).success).toBe(false);
});

test("roleplay feedback prompt is a string", () => {
  expect(typeof roleplayFeedbackPrompt()).toBe("string");
});

test("write task prompt mentions the context", () => {
  const p = writeTaskPrompt(s, "discussing");
  expect(p.system).toContain(CONTEXT_LABEL.discussing.scene);
});

test("write review prompt includes the user's text and the task", () => {
  const p = writeReviewPrompt(s, "discussing", "회의 내용을 정리했습니다.", "Viết biên bản");
  expect(p.user).toContain("회의 내용을 정리했습니다.");
  expect(p.user).toContain("Viết biên bản");
  expect(p.schema).toBe(WriteReview);
});

test("WriteReview score must be 1..5", () => {
  expect(WriteReview.safeParse({ corrected: "", edits: [], score: 6, comment_vi: "" }).success).toBe(false);
});
