import type { ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
  onClick?: () => void;
  kind?: "primary" | "ok" | "bad" | "warn" | "plain";
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}

export function Button({ children, onClick, kind = "plain", block, disabled, loading, type = "button" }: Props) {
  return (
    <button
      type={type}
      class={`btn ${kind === "plain" ? "" : kind} ${block ? "block" : ""}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span class="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
