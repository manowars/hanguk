import { useEffect, useRef, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { Context } from "../../types";
import { MAX_DRAFT_CHARS, type Attempt, type RehearseReview, type RehearseScript } from "../../api/prompts/rehearse";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { Button } from "../../ui/Button";
import { useAsync } from "../../ui/useAsync";
import { toast, toastError } from "../../ui/Toast";
import { speak, stopSpeaking } from "../../speech/tts";
import { listenOnce, stopListening, sttSupported, sttErrorMessage } from "../../speech/stt";
import { charDiff, similarity } from "../../lib/diff";
import { finishLesson, saveVocab } from "../../store/progress";
import { buildScript, reviewRehearsal } from "./flow";

type Step = "draft" | "script" | "practice" | "review";

const SUPPORTS_MIC = sttSupported();
const DRAFT_KEY = "hanguk.rehearse.draft";
const MIN_TO_REVIEW = 2;

function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeDraft(v: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, v);
  } catch {
    /* ignore */
  }
}

export function RehearsePage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(() => (loadContext() === "discussing" ? "presenting" : loadContext()));
  const [step, setStep] = useState<Step>("draft");
  const [draft, setDraft] = useState(loadDraft);
  const [script, setScript] = useState<RehearseScript | null>(null);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [heard, setHeard] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [hideText, setHideText] = useState(false);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState("");
  const [review, setReview] = useState<RehearseReview | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const finishedRef = useRef(false);

  const builder = useAsync(buildScript);
  const reviewer = useAsync(reviewRehearsal);

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  useEffect(() => {
    if (step !== "review" || !review || finishedRef.current) return;
    finishedRef.current = true;
    finishLesson(settings, "speak", context, review.score).then(setSettings).catch(toastError);
  }, [step, review]);

  async function handleBuild() {
    const s = await builder.run(settings, context, draft.trim());
    if (!s) return;
    setScript(s);
    setStep("script");
  }

  function startPractice() {
    setIndex(0);
    setAttempts([]);
    setHeard(null);
    setTries(0);
    setTyped("");
    setStep("practice");
  }

  const segments = script?.segments ?? [];
  const current = segments[index] ?? null;
  const diff = current && heard ? charDiff(current.ko, heard) : null;
  const pct = current && heard ? Math.round(similarity(current.ko, heard) * 100) : null;

  async function handleMic() {
    stopSpeaking();
    setListening(true);
    setHeard(null);
    try {
      setHeard(await listenOnce());
      setTries((n) => n + 1);
    } catch (e) {
      toastError(new Error(sttErrorMessage(e)));
    } finally {
      setListening(false);
    }
  }

  function handleCheckTyped() {
    if (!typed.trim()) return;
    setHeard(typed.trim());
    setTries((n) => n + 1);
  }

  function record(): Attempt[] {
    if (!current) return attempts;
    const a: Attempt = { target: current.ko, said: heard ?? "", similarity: heard ? similarity(current.ko, heard) : 0 };
    return [...attempts, a];
  }

  async function goReview(all: Attempt[]) {
    stopSpeaking();
    const r = await reviewer.run(settings, context, all);
    if (!r) return;
    setReview(r);
    setStep("review");
  }

  function handleNext() {
    const all = record();
    setAttempts(all);
    setHeard(null);
    setTries(0);
    setTyped("");
    if (index + 1 >= segments.length) void goReview(all);
    else setIndex(index + 1);
  }

  async function handleSave(item: { ko: string; vi: string; example: string }) {
    try {
      const ok = await saveVocab(item, context);
      setSaved((s) => new Set(s).add(item.ko));
      toast(ok ? "Đã thêm vào thẻ ôn" : "Thẻ này đã có");
    } catch (e) {
      toastError(e);
    }
  }

  function handleAgain() {
    finishedRef.current = false;
    setReview(null);
    setSaved(new Set());
    startPractice();
  }

  return (
    <>
      <div class="topbar">
        <h1>Tập bài giảng</h1>
        <a class="iconbtn" href="#/" aria-label="Đóng">
          ✕
        </a>
      </div>

      {!settings.apiKey && (
        <div class="card warn">
          <b>Chưa có API key.</b> <a href="#/settings">Vào Cài đặt</a> để dán key.
        </div>
      )}

      {step === "draft" && (
        <div class="stack">
          <p class="muted">
            Dán bài giảng / bài thuyết trình của bạn (tiếng Hàn tự viết, tiếng Việt, hoặc dàn ý). Claude sửa lỗi, chuyển
            thành lời nói chuẩn 합니다체, rồi bạn tập nói từng đoạn và nhận nhận xét phát âm.
          </p>
          <ContextPicker
            value={context}
            onChange={(c) => {
              saveContext(c);
              setContext(c);
            }}
          />
          <textarea
            value={draft}
            maxLength={MAX_DRAFT_CHARS}
            placeholder="Ví dụ: 오늘은 제 연구 결과를 소개하겠습니다..."
            onInput={(e) => {
              const v = (e.target as HTMLTextAreaElement).value;
              setDraft(v);
              storeDraft(v);
            }}
          />
          <div class="muted">
            {draft.length}/{MAX_DRAFT_CHARS}
          </div>
          <Button kind="primary" block onClick={handleBuild} loading={builder.loading} disabled={draft.trim().length < 10}>
            Sửa lỗi & tạo kịch bản
          </Button>
        </div>
      )}

      {step === "script" && script && (
        <div class="stack">
          <h2 class="ko">{script.title}</h2>
          {script.corrections.length > 0 && (
            <>
              <h2>Lỗi trong bản nháp ({script.corrections.length})</h2>
              {script.corrections.map((c, i) => (
                <div class="card" key={i}>
                  <p class="ko">
                    <span class="seg-del">{c.original}</span>
                  </p>
                  <p class="ko">
                    <span class="seg-add">{c.corrected}</span>
                  </p>
                  <p class="muted">{c.why_vi}</p>
                </div>
              ))}
            </>
          )}
          <h2>Kịch bản ({script.segments.length} đoạn)</h2>
          {script.segments.map((s, i) => (
            <div class="card" key={i}>
              <div class="muted">{i + 1}</div>
              <p class="ko">{s.ko}</p>
              <p class="muted">{s.vi}</p>
              <p class="muted">💡 {s.tip_vi}</p>
              <Button onClick={() => speak(s.ko, settings.ttsRate)}>🔊 Nghe</Button>
            </div>
          ))}
          <Button kind="primary" block onClick={startPractice}>
            Bắt đầu tập nói
          </Button>
          <Button block onClick={() => setStep("draft")}>
            Sửa bản nháp
          </Button>
        </div>
      )}

      {step === "practice" && current && (
        <div class="card">
          <div class="row" style="justify-content:space-between">
            <span class="muted">
              Đoạn {index + 1}/{segments.length}
            </span>
            <label class="muted">
              <input type="checkbox" checked={hideText} onChange={() => setHideText(!hideText)} /> Ẩn chữ (tập thuộc)
            </label>
          </div>
          {hideText && !heard ? (
            <p class="muted">{current.vi}</p>
          ) : (
            <>
              <p class="ko">{current.ko}</p>
              <p class="muted">💡 {current.tip_vi}</p>
            </>
          )}
          <div class="row">
            <Button onClick={() => speak(current.ko, settings.ttsRate)}>🔊 Nghe mẫu</Button>
          </div>

          {!heard && SUPPORTS_MIC && (
            <button
              type="button"
              class={`mic ${listening ? "live" : ""}`}
              aria-label="Nói"
              onClick={handleMic}
              disabled={listening || reviewer.loading}
            >
              🎙️
            </button>
          )}
          {!heard && !SUPPORTS_MIC && (
            <div class="stack">
              <input
                type="text"
                value={typed}
                placeholder="Máy này không nhận giọng nói. Gõ câu bạn nói..."
                onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
              />
              <Button kind="primary" onClick={handleCheckTyped} disabled={!typed.trim()}>
                Kiểm tra
              </Button>
            </div>
          )}

          {heard && diff && (
            <div>
              <p class="muted">Máy nghe được:</p>
              <p class="ko">{heard}</p>
              <p class="muted">So với kịch bản (gạch đỏ = thiếu/sai, vàng = thừa):</p>
              <p class="ko">
                {diff.map((seg, i) => (
                  <span key={i} class={`seg-${seg.t}`}>
                    {seg.s}
                  </span>
                ))}
              </p>
              <p class="muted">
                Giống: {pct}% · lần {tries}
              </p>
              <div class="row">
                <Button onClick={() => setHeard(null)}>Nói lại</Button>
                <Button kind="primary" onClick={handleNext} loading={reviewer.loading}>
                  {index + 1 >= segments.length ? "Xong & nhận xét" : "Đoạn tiếp"}
                </Button>
              </div>
            </div>
          )}

          {!heard && index >= MIN_TO_REVIEW && (
            <Button block onClick={() => goReview(attempts)} loading={reviewer.loading}>
              Dừng & nhận xét {index} đoạn đã tập
            </Button>
          )}
        </div>
      )}

      {step === "review" && review && (
        <div class="stack">
          <div class="card ok">
            <p class="big">{review.score}/100</p>
            <p>{review.overall_vi}</p>
          </div>
          {review.segments.length > 0 && <h2>Cần sửa</h2>}
          {review.segments.map((s, i) => (
            <div class="card" key={i}>
              <div class="muted">Đoạn {s.index}</div>
              <p>{s.problem_vi}</p>
              <p class="ko">
                <span class="seg-del">{s.you_said}</span>
              </p>
              <p class="ko">
                <span class="seg-add">{s.better_ko}</span>
              </p>
              <Button onClick={() => speak(s.better_ko, settings.ttsRate)}>🔊</Button>
            </div>
          ))}
          {review.pronunciation.length > 0 && <h2>Phát âm</h2>}
          {review.pronunciation.map((p, i) => (
            <div class="card" key={i}>
              <p class="ko">
                {p.word} <span class="muted">→ máy nghe: {p.heard}</span>
              </p>
              <p class="muted">{p.tip_vi}</p>
              <Button onClick={() => speak(p.word, Math.min(settings.ttsRate, 0.8))}>🔊 Nghe chậm</Button>
            </div>
          ))}
          <div class="card">
            <h2>Cách trình bày</h2>
            <p>{review.delivery_vi}</p>
          </div>
          {review.keep.length > 0 && <h2>Cụm nên nhớ</h2>}
          {review.keep.map((k) => (
            <div class="card" key={k.ko}>
              <p class="ko">{k.ko}</p>
              <p class="muted">{k.vi}</p>
              <Button onClick={() => handleSave(k)} disabled={saved.has(k.ko)}>
                {saved.has(k.ko) ? "✓ Đã lưu" : "+ Thẻ ôn"}
              </Button>
            </div>
          ))}
          <Button kind="primary" block onClick={handleAgain}>
            Tập lại kịch bản này
          </Button>
          <Button block onClick={() => setStep("draft")}>
            Bài mới
          </Button>
        </div>
      )}
    </>
  );
}
