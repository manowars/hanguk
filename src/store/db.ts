import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Card, LessonResult } from "../types";

interface HangukDB extends DBSchema {
  lessons: { key: string; value: LessonResult; indexes: { date: number } };
  cards: { key: string; value: Card; indexes: { due: number } };
}

let dbp: Promise<IDBPDatabase<HangukDB>> | null = null;

function db(): Promise<IDBPDatabase<HangukDB>> {
  if (!dbp) {
    dbp = openDB<HangukDB>("hanguk", 1, {
      upgrade(d) {
        d.createObjectStore("lessons", { keyPath: "id" }).createIndex("date", "date");
        d.createObjectStore("cards", { keyPath: "id" }).createIndex("due", "due");
      },
    });
  }
  return dbp;
}

export async function saveLesson(r: LessonResult): Promise<void> {
  await (await db()).put("lessons", r);
}

export async function listLessons(): Promise<LessonResult[]> {
  const all = await (await db()).getAllFromIndex("lessons", "date");
  return all.reverse();
}

export async function saveCard(c: Card): Promise<void> {
  await (await db()).put("cards", c);
}

export async function deleteCard(id: string): Promise<void> {
  await (await db()).delete("cards", id);
}

export async function dueCards(now: number): Promise<Card[]> {
  return (await db()).getAllFromIndex("cards", "due", IDBKeyRange.upperBound(now));
}

export async function allCards(): Promise<Card[]> {
  const all = await (await db()).getAll("cards");
  return all.sort((a, b) => a.due - b.due);
}

export async function hasCard(ko: string): Promise<boolean> {
  const all = await (await db()).getAll("cards");
  return all.some((c) => c.ko === ko);
}

interface Backup {
  version: 1;
  exported: number;
  lessons: LessonResult[];
  cards: Card[];
  settings: unknown;
}

export async function exportJson(settings: unknown): Promise<string> {
  const d = await db();
  const b: Backup = {
    version: 1,
    exported: Date.now(),
    lessons: await d.getAll("lessons"),
    cards: await d.getAll("cards"),
    settings,
  };
  return JSON.stringify(b, null, 2);
}

/** Merges a backup into the database. Returns the settings object stored in the backup, if any. */
export async function importJson(json: string): Promise<unknown> {
  const b = JSON.parse(json) as Partial<Backup>;
  if (b.version !== 1 || !Array.isArray(b.cards) || !Array.isArray(b.lessons)) {
    throw new Error("File không đúng định dạng Hanguk.");
  }
  const d = await db();
  const tx = d.transaction(["lessons", "cards"], "readwrite");
  await Promise.all([
    ...b.lessons.map((l) => tx.objectStore("lessons").put(l)),
    ...b.cards.map((c) => tx.objectStore("cards").put(c)),
    tx.done,
  ]);
  return b.settings;
}
