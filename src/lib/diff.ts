export type Seg = { t: "same" | "add" | "del"; s: string };

const STRIP = /[\s.,!?~…·'"“”‘’()\-]/g;

function norm(s: string): string[] {
  return Array.from(s.replace(STRIP, ""));
}

function lcsTable(a: string[], b: string[]): number[][] {
  const t: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  return t;
}

function push(out: Seg[], t: Seg["t"], s: string) {
  const last = out[out.length - 1];
  if (last && last.t === t) last.s += s;
  else out.push({ t, s });
}

/** Character diff of `actual` against `target`, ignoring spaces and punctuation. */
export function charDiff(target: string, actual: string): Seg[] {
  const a = norm(target);
  const b = norm(actual);
  const t = lcsTable(a, b);
  const out: Seg[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(out, "same", a[i]);
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) {
      push(out, "del", a[i]);
      i++;
    } else {
      push(out, "add", b[j]);
      j++;
    }
  }
  while (i < a.length) push(out, "del", a[i++]);
  while (j < b.length) push(out, "add", b[j++]);
  return out;
}

/** 0..1, based on longest common subsequence of normalized characters. */
export function similarity(target: string, actual: string): number {
  const a = norm(target);
  const b = norm(actual);
  if (a.length === 0 || b.length === 0) return 0;
  const lcs = lcsTable(a, b)[0][0];
  return (2 * lcs) / (a.length + b.length);
}
