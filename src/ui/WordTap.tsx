import { useState } from "preact/hooks";
import type { VocabItem } from "../types";

interface Props {
  text: string;
  vocab: VocabItem[];
  onSave: (item: VocabItem) => void;
}

const TRAIL = /[.,!?~…:;'"“”‘’()]+$/;

function match(word: string, vocab: VocabItem[]): VocabItem | undefined {
  const w = word.replace(TRAIL, "");
  if (!w) return undefined;
  return vocab.find((v) => w.startsWith(v.ko) || v.ko.startsWith(w) || v.ko.split(" ").some((p) => p.length > 1 && w.startsWith(p)));
}

/** Renders Korean text word by word. Tapping a word in the vocab list opens a popover with its meaning. */
export function WordTap({ text, vocab, onSave }: Props) {
  const [open, setOpen] = useState<VocabItem | null>(null);
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <div class="ko">
      {paragraphs.map((p, pi) => (
        <p key={pi}>
          {p.split(/(\s+)/).map((tok, i) => {
            if (/^\s+$/.test(tok)) return tok;
            const hit = match(tok, vocab);
            return (
              <span
                key={i}
                class={`word ${hit ? "known" : ""}`}
                onClick={() => hit && setOpen(open === hit ? null : hit)}
              >
                {tok}
              </span>
            );
          })}
        </p>
      ))}
      {open && (
        <div class="popover" onClick={(e) => e.stopPropagation()}>
          <div class="row" style="justify-content:space-between">
            <b style="font-size:20px">{open.ko}</b>
            <button class="iconbtn" aria-label="Đóng" onClick={() => setOpen(null)}>
              ✕
            </button>
          </div>
          <div>{open.vi}</div>
          {open.example && <div class="muted">{open.example}</div>}
          <button
            class="btn primary"
            style="margin-top:10px"
            onClick={() => {
              onSave(open);
              setOpen(null);
            }}
          >
            Lưu vào từ vựng
          </button>
        </div>
      )}
    </div>
  );
}
