import { CONTEXTS, type Context } from "../types";
import { CONTEXT_LABEL } from "../api/prompts/common";

const KEY = "hanguk.context";

export function loadContext(): Context {
  try {
    const v = localStorage.getItem(KEY) as Context | null;
    return v && CONTEXTS.includes(v) ? v : "teaching";
  } catch {
    return "teaching";
  }
}

export function saveContext(c: Context): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* ignore */
  }
}

export function ContextPicker({ value, onChange }: { value: Context; onChange: (c: Context) => void }) {
  return (
    <div class="chips" role="radiogroup" aria-label="Bối cảnh">
      {CONTEXTS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          class={`chip ${value === c ? "on" : ""}`}
          onClick={() => onChange(c)}
        >
          {CONTEXT_LABEL[c].vi}
        </button>
      ))}
    </div>
  );
}
