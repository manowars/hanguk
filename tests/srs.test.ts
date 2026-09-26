import { expect, test } from "vitest";
import { newCard, review } from "../src/store/srs";

const DAY = 86400000;
const base = newCard({ ko: "유동층", vi: "tầng sôi", example: "", context: "teaching" }, 0);

test("new card is due now", () => {
  expect(base.due).toBe(0);
  expect(base.reps).toBe(0);
  expect(base.ease).toBe(2.5);
});

test("quality 5 first review -> 1 day", () => {
  const c = review(base, 5, 0);
  expect(c.interval).toBe(1);
  expect(c.reps).toBe(1);
  expect(c.due).toBe(DAY);
});

test("second good review -> 6 days", () => {
  const c = review(review(base, 4, 0), 4, 0);
  expect(c.interval).toBe(6);
  expect(c.reps).toBe(2);
});

test("third review multiplies by ease", () => {
  const c = review(review(review(base, 5, 0), 5, 0), 5, 0);
  expect(c.interval).toBeGreaterThan(6);
});

test("fail resets reps and interval", () => {
  const c = review(review(base, 5, 0), 1, 0);
  expect(c.reps).toBe(0);
  expect(c.interval).toBe(1);
});

test("ease never below 1.3", () => {
  let c = base;
  for (let i = 0; i < 20; i++) c = review(c, 3, 0);
  expect(c.ease).toBeGreaterThanOrEqual(1.3);
});

test("review does not mutate input", () => {
  const before = { ...base };
  review(base, 5, 0);
  expect(base).toEqual(before);
});
