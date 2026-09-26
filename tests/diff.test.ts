import { expect, test } from "vitest";
import { charDiff, similarity } from "../src/lib/diff";

test("identical -> one same segment", () => {
  expect(charDiff("안녕", "안녕")).toEqual([{ t: "same", s: "안녕" }]);
});

test("missing char shows del", () => {
  expect(charDiff("안녕하세요", "안녕세요")).toEqual([
    { t: "same", s: "안녕" },
    { t: "del", s: "하" },
    { t: "same", s: "세요" },
  ]);
});

test("extra char shows add", () => {
  expect(charDiff("안녕", "안녕요")).toEqual([
    { t: "same", s: "안녕" },
    { t: "add", s: "요" },
  ]);
});

test("diff ignores spaces and punctuation", () => {
  expect(charDiff("안녕하세요.", "안녕 하세요")).toEqual([{ t: "same", s: "안녕하세요" }]);
});

test("similarity ignores spaces and punctuation", () => {
  expect(similarity("안녕하세요.", "안녕 하세요")).toBe(1);
});

test("similarity of empty actual is 0", () => {
  expect(similarity("안녕", "")).toBe(0);
});

test("similarity is between 0 and 1", () => {
  const s = similarity("유동층 반응기", "유동 반응기");
  expect(s).toBeGreaterThan(0.5);
  expect(s).toBeLessThan(1);
});
