import { useEffect, useRef, useState } from "preact/hooks";
import type Anthropic from "@anthropic-ai/sdk";
import type { PageProps } from "../../app";
import type { Context } from "../../types";
import type { RoleplayFeedback } from "../../api/prompts/speak";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { Button } from "../../ui/Button";
import { useAsync } from "../../ui/useAsync";
import { toastError } from "../../ui/Toast";
import { speak, stopSpeaking } from "../../speech/tts";
import { listenOnce, stopListening, sttSupported, sttErrorMessage } from "../../speech/stt";
import { finishLesson } from "../../store/progress";
import { startRoleplay, roleplayReply, roleplayFeedback } from "./flow";

type Step = "setup" | "chat" | "feedback";

interface Turn {
  who: "ai" | "me";
  ko: string;
  vi: string | null;
  showVi: boolean;
}

const SUPPORTS_MIC = sttSupported();
const MIN_TURNS_TO_FINISH = 3;
const MAX_TURNS = 6;

export function RoleplayPage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(loadContext);
  const [step, setStep] = useState<Step>("setup");
  const [system, setSystem] = useState("");
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [done, setDone] = useState(false);
  const [listening, setListening] = useState(false);
  const [typeMode, setTypeMode] = useState(!SUPPORTS_MIC);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<RoleplayFeedback | null>(null);
  const finishedRef = useRef(false);

  const starter = useAsync(startRoleplay);
  const replier = useAsync(roleplayReply);
  const grader = useAsync(roleplayFeedback);

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  useEffect(() => {
    if (step !== "feedback" || !feedback || finishedRef.current) return;
    finishedRef.current = true;
    finishLesson(settings, "speak", context, feedback.score).then(setSettings).catch(toastError);
  }, [step, feedback]);

  async function handleStart() {
    const session = await starter.run(settings, context);
    if (!session) return;
    setSystem(session.system);
    setMessages(session.messages);
    setTurns([{ who: "ai", ko: session.first.reply_ko, vi: session.first.reply_vi, showVi: false }]);
    setTurnCount(0);
    setDone(session.first.done);
    setStep("chat");
    void speak(session.first.reply_ko, settings.ttsRate);
  }

  async function send(text: string) {
    if (!text.trim()) return;
    setTurns((t) => [...t, { who: "me", ko: text, vi: null, showVi: false }]);
    const result = await replier.run(settings, system, messages, text);
    if (!result) return;
    setMessages(result.messages);
    setTurnCount((n) => n + 1);
    setDone(result.turn.done);
    setTurns((t) => [...t, { who: "ai", ko: result.turn.reply_ko, vi: result.turn.reply_vi, showVi: false }]);
    void speak(result.turn.reply_ko, settings.ttsRate);
  }

  async function handleMic() {
    setListening(true);
    try {
      await send(await listenOnce());
    } catch (e) {
      toastError(new Error(sttErrorMessage(e)));
    } finally {
      setListening(false);
    }
  }

  async function handleSendTyped() {
    const text = typed.trim();
    if (!text) return;
    setTyped("");
    await send(text);
  }

  async function handleFinish() {
    const result = await grader.run(settings, system, messages);
    if (!result) return;
    setFeedback(result);
    setStep("feedback");
  }

  function handleRestart() {
    finishedRef.current = false;
    setStep("setup");
    setTurns([]);
    setMessages([]);
    setTurnCount(0);
    setDone(false);
    setFeedback(null);
    setTyped("");
  }

  const canFinish = turnCount >= MIN_TURNS_TO_FINISH;
  const mustFinish = turnCount >= MAX_TURNS || done;

  return (
    <>
      <div class="topbar">
        <h1>Đóng vai</h1>
        <a class="iconbtn" href="#/" aria-label="Đóng">
          ✕
        </a>
      </div>
      <p>
        <a href="#/shadow">← Nhại câu</a>
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
          <Button kind="primary" block onClick={handleStart} loading={starter.loading}>
            Bắt đầu
          </Button>
        </>
      )}

      {step === "chat" && (
        <>
          <div class="stack">
            {turns.map((t, i) => (
              <div
                key={i}
                class={`bubble ${t.who === "ai" ? "ai" : "me"}`}
                onClick={() => {
                  if (t.who !== "ai") return;
                  setTurns((ts) => ts.map((x, j) => (j === i ? { ...x, showVi: !x.showVi } : x)));
                }}
              >
                <div class="ko">{t.ko}</div>
                {t.who === "ai" && t.showVi && t.vi && <div class="muted">{t.vi}</div>}
              </div>
            ))}
          </div>

          {!typeMode && SUPPORTS_MIC && (
            <div class="row" style="justify-content:center">
              <button
                type="button"
                class={`mic ${listening ? "live" : ""}`}
                aria-label="Nói"
                onClick={handleMic}
                disabled={listening || replier.loading}
              >
                🎙️
              </button>
            </div>
          )}
          {typeMode && (
            <div class="stack">
              <textarea
                value={typed}
                placeholder="Gõ câu trả lời..."
                onInput={(e) => setTyped((e.target as HTMLTextAreaElement).value)}
              />
              <Button kind="primary" onClick={handleSendTyped} loading={replier.loading} disabled={!typed.trim()}>
                Gửi
              </Button>
            </div>
          )}
          {SUPPORTS_MIC && (
            <div class="row">
              <Button onClick={() => setTypeMode(!typeMode)}>⌨ Gõ</Button>
            </div>
          )}

          {canFinish && (
            <Button kind={mustFinish ? "primary" : "plain"} block onClick={handleFinish} loading={grader.loading}>
              Kết thúc & nhận xét
            </Button>
          )}
        </>
      )}

      {step === "feedback" && feedback && (
        <div class="stack">
          <div class="card">
            <h2>Cách xưng hô</h2>
            <p>{feedback.honorific}</p>
          </div>
          <div class="card">
            <h2>Tự nhiên</h2>
            <p>{feedback.naturalness}</p>
          </div>
          {feedback.better.map((b, i) => (
            <div class="card" key={i}>
              <p class="ko">
                <span class="seg-del">{b.you_said}</span>
              </p>
              <p class="ko">
                <span class="seg-add">{b.better}</span>
              </p>
              <p class="muted">{b.why_vi}</p>
            </div>
          ))}
          <p class="big">{feedback.score}/100</p>
          <Button kind="primary" block onClick={handleRestart}>
            Làm lại
          </Button>
        </div>
      )}
    </>
  );
}
