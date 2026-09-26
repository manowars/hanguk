import { signal } from "@preact/signals";

const TOAST_MS = 3500;
const msg = signal<string | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(text: string): void {
  msg.value = text;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => (msg.value = null), TOAST_MS);
}

export function toastError(e: unknown): void {
  toast(e instanceof Error ? e.message : String(e));
}

export function ToastHost() {
  if (!msg.value) return null;
  return (
    <div class="toast" role="status" onClick={() => (msg.value = null)}>
      {msg.value}
    </div>
  );
}
