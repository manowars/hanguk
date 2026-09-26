import { useEffect, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { Context, VocabItem } from "../../types";
import type { ReadLesson } from "../../api/prompts/read";
import { startRead, scoreRead } from "./flow";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { WordTap } from "../../ui/WordTap";
import { Button } from "../../ui/Button";
import { toast, toastError } from "../../ui/Toast";
import { useAsync } from "../../ui/useAsync";
import { speak, stopSpeaking } from "../../speech/tts";
import { finishLesson, saveVocab } from "../../store/progress";

type Stage = "idle" | "loading" | "reading" | "result";

export function ReadPage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(loadContext);
  const [stage, setStage] = useState<Stage>("idle");
  const [lesson, setLesson] = useState<ReadLesson | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showGloss, setShowGloss] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { run, loading } = useAsync(startRead);

  useEffect(() => () => stopSpeaking(), []);

  function pickContext(c: Context) {
    setContext(c);
    saveContext(c);
  }

  async function create() {
    setStage("loading");
    const l = await run(settings, context);
    if (!l) {
      setStage("idle");
      return;
    }
    setLesson(l);
    setAnswers(l.questions.map(() => null));
    setShowGloss(false);
    setStage("reading");
  }

  function choose(qi: number, ci: number) {
    setAnswers((a) => a.map((v, i) => (i === qi ? ci : v)));
  }

  async function submit() {
    if (!lesson) return;
    stopSpeaking();
    setSpeaking(false);
    const score = scoreRead(lesson, answers);
    setStage("result");
    const next = await finishLesson(settings, "read", context, score);
    setSettings(next);
  }

  async function onSave(item: VocabItem) {
    try {
      const saved = await saveVocab(item, context);
      toast(saved ? "Đã lưu" : "Đã có trong từ vựng");
    } catch (e) {
      toastError(e);
    }
  }

  async function toggleSpeak() {
    if (!lesson) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await speak(lesson.text, settings.ttsRate);
    setSpeaking(false);
  }

  function again() {
    setLesson(null);
    setAnswers([]);
    setStage("idle");
  }

  const allAnswered = answers.length > 0 && answers.every((a) => a !== null);
  const score = lesson ? scoreRead(lesson, answers) : 0;

  return (
    <div>
      <div class="topbar">
        <h1>Đọc</h1>
        <a class="iconbtn" href="#/" aria-label="Đóng">
          ✕
        </a>
      </div>

      {!settings.apiKey.trim() && (
        <div class="card warn">
          Chưa có API key. Vào <a href="#/settings">Cài đặt</a> để dán key.
        </div>
      )}

      {stage === "idle" && (
        <div class="stack">
          <ContextPicker value={context} onChange={pickContext} />
          <Button kind="primary" block onClick={create} loading={loading} disabled={!settings.apiKey.trim()}>
            Tạo bài
          </Button>
        </div>
      )}

      {stage === "loading" && <div class="card">Đang tạo bài đọc…</div>}

      {stage === "reading" && lesson && (
        <div class="stack">
          <div class="muted">{lesson.kind}</div>
          <div>
            <b>{lesson.title}</b>
          </div>
          <WordTap text={lesson.text} vocab={lesson.vocab} onSave={onSave} />
          <div class="row">
            <Button onClick={toggleSpeak}>{speaking ? "⏹" : "🔊 Đọc to"}</Button>
          </div>
          {lesson.questions.map((q, qi) => (
            <div key={qi}>
              <p>{q.q}</p>
              {q.choices.map((c, ci) => (
                <div key={ci} class={`choice ${answers[qi] === ci ? "on" : ""}`} onClick={() => choose(qi, ci)}>
                  {c}
                </div>
              ))}
            </div>
          ))}
          <Button kind="primary" block onClick={submit} disabled={!allAnswered}>
            Nộp
          </Button>
        </div>
      )}

      {stage === "result" && lesson && (
        <div class="stack">
          <div class="big">{score}%</div>
          {lesson.questions.map((q, qi) => (
            <div key={qi}>
              <p>{q.q}</p>
              {q.choices.map((c, ci) => {
                const cls = ci === q.answer ? "right" : ci === answers[qi] ? "wrong" : "";
                return (
                  <div key={ci} class={`choice ${cls}`}>
                    {c}
                  </div>
                );
              })}
            </div>
          ))}
          <Button onClick={() => setShowGloss((v) => !v)}>Xem bản dịch</Button>
          {showGloss && <p>{lesson.gloss_vi}</p>}
          <Button kind="primary" block onClick={again}>
            Bài mới
          </Button>
        </div>
      )}
    </div>
  );
}
