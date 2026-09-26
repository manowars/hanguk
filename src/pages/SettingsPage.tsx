import { useState } from "preact/hooks";
import type { PageProps } from "../app";
import { MODELS, saveSettings, loadSettings } from "../store/settings";
import { exportJson, importJson } from "../store/db";
import { hasKoreanVoice, speak, ttsSupported } from "../speech/tts";
import { sttSupported } from "../speech/stt";
import { Button } from "../ui/Button";
import { toast, toastError } from "../ui/Toast";
import type { Settings } from "../types";

export function SettingsPage({ settings, setSettings }: PageProps) {
  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);

  const save = () => {
    const next = { ...draft, apiKey: draft.apiKey.trim() };
    saveSettings(next);
    setSettings(next);
    toast("Đã lưu.");
  };

  const testVoice = async () => {
    if (!ttsSupported()) return toast("Máy này không có đọc văn bản.");
    setBusy(true);
    await speak("안녕하세요. 오늘 강의를 시작하겠습니다.", draft.ttsRate);
    setBusy(false);
  };

  const doExport = async () => {
    try {
      const json = await exportJson(loadSettings());
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hanguk-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toastError(e);
    }
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = await importJson(await file.text());
      if (restored && typeof restored === "object") {
        const merged = { ...loadSettings(), ...(restored as Partial<Settings>), apiKey: draft.apiKey };
        saveSettings(merged);
        setSettings(merged);
        setDraft(merged);
      }
      toast("Đã nhập dữ liệu.");
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <div class="topbar">
        <h1>Cài đặt</h1>
        <a class="iconbtn" href="#/" aria-label="Về trang chủ">
          ✕
        </a>
      </div>

      <div class="card">
        <label class="field">
          <span>Claude API key (lưu trong máy này, không gửi đi đâu khác ngoài api.anthropic.com)</span>
          <div class="row" style="flex-wrap:nowrap">
            <input
              type={showKey ? "text" : "password"}
              value={draft.apiKey}
              placeholder="sk-ant-…"
              autocomplete="off"
              onInput={(e) => setDraft({ ...draft, apiKey: (e.target as HTMLInputElement).value })}
            />
            <button class="iconbtn" type="button" onClick={() => setShowKey(!showKey)} aria-label="Hiện/ẩn key">
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
        </label>
        <p class="muted">
          Lấy key tại <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>.
        </p>
        <label class="field">
          <span>Model</span>
          <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: (e.target as HTMLSelectElement).value })}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="card">
        <label class="field">
          <span>Tốc độ đọc: {draft.ttsRate.toFixed(2)}×</span>
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.05"
            value={draft.ttsRate}
            onInput={(e) => setDraft({ ...draft, ttsRate: Number((e.target as HTMLInputElement).value) })}
          />
        </label>
        <div class="row">
          <Button onClick={testVoice} loading={busy}>
            🔊 Thử giọng
          </Button>
          {!hasKoreanVoice() && ttsSupported() && (
            <span class="muted">Chưa thấy giọng tiếng Hàn. Trên Samsung: Cài đặt → Quản lý chung → Chuyển văn bản thành giọng nói → cài tiếng Hàn.</span>
          )}
        </div>
        <p class="muted">Nhận giọng nói: {sttSupported() ? "có" : "không (sẽ dùng ô gõ chữ)"}.</p>
      </div>

      <div class="card">
        <label class="field">
          <span>Lĩnh vực của bạn (tiếng Anh, dùng để tạo bài)</span>
          <textarea
            value={draft.field}
            style="min-height:90px"
            onInput={(e) => setDraft({ ...draft, field: (e.target as HTMLTextAreaElement).value })}
          />
        </label>
        <div class="grid2">
          {(["listen", "speak", "read", "write"] as const).map((k) => (
            <label class="field" key={k}>
              <span>Trình độ {({ listen: "Nghe", speak: "Nói", read: "Đọc", write: "Viết" })[k]} (TOPIK)</span>
              <select
                value={draft.levels[k]}
                onChange={(e) =>
                  setDraft({ ...draft, levels: { ...draft.levels, [k]: Number((e.target as HTMLSelectElement).value) } })
                }
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <Button kind="primary" block onClick={save}>
        Lưu cài đặt
      </Button>

      <h2>Sao lưu</h2>
      <div class="row">
        <Button onClick={doExport}>⬇ Xuất JSON</Button>
        <label class="btn">
          ⬆ Nhập JSON
          <input
            type="file"
            accept="application/json"
            style="display:none"
            onChange={(e) => doImport((e.target as HTMLInputElement).files?.[0])}
          />
        </label>
      </div>
      <p class="muted">Xuất gồm bài đã làm, thẻ từ vựng và cài đặt (trừ API key).</p>
    </>
  );
}
