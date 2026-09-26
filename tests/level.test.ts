import { expect, test } from "vitest";
import { nextLevel, pushScore } from "../src/store/level";

test("pushScore keeps last 10", () => {
  expect(pushScore([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("pushScore does not mutate input", () => {
  const h = [1, 2];
  pushScore(h, 3);
  expect(h).toEqual([1, 2]);
});

test("level up when 10-lesson avg > 85", () => {
  expect(nextLevel(3, Array(10).fill(90))).toBe(4);
});

test("no level up at exactly 85", () => {
  expect(nextLevel(3, Array(10).fill(85))).toBe(3);
});

test("no level up with fewer than 10", () => {
  expect(nextLevel(3, Array(9).fill(100))).toBe(3);
});

test("caps at 6", () => {
  expect(nextLevel(6, Array(10).fill(100))).toBe(6);
});
