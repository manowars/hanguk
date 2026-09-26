import { useEffect, useRef, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { Context } from "../../types";
import type { ShadowSet } from "../../api/prompts/speak";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { Button } from "../../ui/Button";
import { useAsync } from "../../ui/useAsync";
import { toastError } from "../../ui/Toast";
import { speak, stopSpeaking } from "../../speech/tts";
import { listenOnce, stopListening, sttSupported, sttErrorMessage } from "../../speech/stt";
import { charDiff, similarity } from "../../lib/diff";
import { finishLesson } from "../../store/progress";
import { startShadow } from "./flow";

type Step = "setup" | "practice" | "done";

const SUPPORTS_MIC = sttSupported();

export function ShadowPage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(loadContext);
  const [step, setStep] = useState<Step>("setup");
  const [sentences, setSentences] = useState<ShadowSet["sentences"] | null>(null);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState("");
  const [meanScore, setMeanScore] = useState(0);
  const finishedRef = useRef(false);

  const gen = useAsync(startShadow);

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  useEffect(() => {
    if (step !== "done" || finishedRef.current) return;
    finishedRef.current = true;
    finishLesson(settings, "speak", context, meanScore).then(setSettings).catch(toastError);
  }, [step]);

  async function handleGenerate() {
    const set = await gen.run(settings, context);
    if (!set) return;
    setSentences(set.sentences);
    setIndex(0);
    setScores([]);
    setRecognized(null);
    setTyped("");
    setStep("practice");
  }

  const current = sentences?.[index] ?? null;
  const diff = current && recognized ? charDiff(current.ko, recognized) : null;
  const pct = current && recognized ? Math.round(similarity(current.ko, recognized) * 100) : null;

  async function handleMic() {
    setListening(true);
    setRecognized(null);
    try {
      setRecognized(await listenOnce());
    } catch (e) {
      toastError(new Error(sttErrorMessage(e)));
    } finally {
      setListening(false);
    }
  }

  function handleCheckTyped() {
    if (!typed.trim()) return;
    setRecognized(typed.trim());
  }

  function handleRetry() {
    setRecognized(null);
    setTyped("");
  }

  function handleNext() {
    const next = [...scores, pct ?? 0];
    setRecognized(null);
    setTyped("");
    if (index + 1 >= 6) {
      setMeanScore(Math.round(next.reduce((a, b) => a + b, 0) / next.length));
      setStep("done");
    } else {
      setScores(next);
      setIndex(index + 1);
    }
  }

  function handleRestart() {
    finishedRef.current = false;
    setStep("setup");
    setSentences(null);
    setIndex(0);
    setScores([]);
    setRecognized(null);
    setTyped("");
  }

  return (
    <>
      <div class="topbar">
        <h1>Nhại câu</h1>
        <a class="iconbtn" href="#/" aria-label="Đóng">
          ✕
        </a>
      </div>
      <p>
        <a href="#/roleplay">Đóng vai →</a>
      </p>

      {!settings.apiKey && (
        <div class="card warn">
          <b>Chưa có API key.</b> <a href="#/settings">Vào Cài đặt</a> để dán key.
        </div>
      )}

      {step === "setup" && (
        <>
          <ContextPicker
            value={context}
            onChange={(c) => {
              saveContext(c);
              setContext(c);
            }}
          />
          <Button kind="primary" block onClick={handleGenerate} loading={gen.loading}>
            Tạo 6 câu
          </Button>
        </>
      )}

      {step === "practice" && current && (
        <div class="card">
          <div class="muted">{index + 1}/6</div>
          <p class="ko">{current.ko}</p>
          <p class="muted">{current.vi}</p>
          <div class="row">
            <Button onClick={() => speak(current.ko, settings.ttsRate)}>🔊 Nghe</Button>
          </div>

          {!recognized && SUPPORTS_MIC && (
            <button
              type="button"
              class={`mic ${listening ? "live" : ""}`}
              aria-label="Nói"
              onClick={handleMic}
              disabled={listening}
            >
              🎙️
            </button>
          )}
          {!recognized && !SUPPORTS_MIC && (
            <div class="stack">
              <input
                type="text"
                value={typed}
                placeholder="Gõ câu bạn nói..."
                onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
              />
              <Button kind="primary" onClick={handleCheckTyped} disabled={!typed.trim()}>
                Kiểm tra
              </Button>
            </div>
          )}

          {recognized && diff && (
            <div>
              <p class="ko">
                {diff.map((seg, i) => (
                  <span key={i} class={`seg-${seg.t}`}>
                    {seg.s}
                  </span>
                ))}
              </p>
              <p class="muted">Giống: {pct}%</p>
              <div class="row">
                <Button onClick={handleRetry}>Thử lại</Button>
                <Button kind="primary" onClick={handleNext}>
                  Tiếp
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "done" && (
        <div class="card ok">
          <p class="big">{meanScore}%</p>
          <p class="muted">Độ giống trung bình 6 câu.</p>
          <Button kind="primary" block onClick={handleRestart}>
            Làm lại
          </Button>
        </div>
      )}
    </>
  );
}
