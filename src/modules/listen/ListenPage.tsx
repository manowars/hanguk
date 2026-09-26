import { useEffect, useRef, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { ListenLesson } from "../../api/prompts/listen";
import type { Context, VocabItem } from "../../types";
import { startListen, scoreListen } from "./flow";
import { speak, stopSpeaking } from "../../speech/tts";
import { finishLesson, saveVocab } from "../../store/progress";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { WordTap } from "../../ui/WordTap";
import { Button } from "../../ui/Button";
import { toast, toastError } from "../../ui/Toast";
import { useAsync } from "../../ui/useAsync";

type Phase = "idle" | "loading" | "playing" | "quiz" | "result";

export function ListenPage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(loadContext);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lesson, setLesson] = useState<ListenLesson | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [score, setScore] = useState(0);
  const [showGloss, setShowGloss] = useState(false);
  const finishedRef = useRef(false);

  const { run, loading } = useAsync((ctx: Context) => startListen(settings, ctx));

  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    if (phase !== "result" || !lesson || finishedRef.current) return;
    finishedRef.current = true;
    finishLesson(settings, "listen", context, score).then(setSettings, toastError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const onCreate = async () => {
    setPhase("loading");
    const l = await run(context);
    if (!l) {
      setPhase("idle");
      return;
    }
    setLesson(l);
    setAnswers(l.questions.map(() => null));
    setShowGloss(false);
    finishedRef.current = false;
    setPhase("playing");
  };

  const play = async (rate: number) => {
    if (!lesson) return;
    setIsSpeaking(true);
    await speak(lesson.script, rate);
    setIsSpeaking(false);
  };

  const stop = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const pick = (qi: number, ci: number) => {
    setAnswers(answers.map((a, i) => (i === qi ? ci : a)));
  };

  const submit = () => {
    if (!lesson) return;
    setScore(scoreListen(lesson, answers));
    setPhase("result");
  };

  const reset = () => {
    stopSpeaking();
    setLesson(null);
    setAnswers([]);
    setScore(0);
    setPhase("idle");
  };

  const onSaveVocab = async (item: VocabItem) => {
    try {
      const saved = await saveVocab(item, context);
      toast(saved ? "Đã lưu" : "Đã có trong từ vựng");
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <div class="topbar">
        <h1>Nghe</h1>
        <a class="iconbtn" href="#/" aria-label="Về trang chủ">
          ✕
        </a>
      </div>

      {(phase === "idle" || phase === "loading") && (
        <>
          <ContextPicker
            value={context}
            onChange={(c) => {
              saveContext(c);
              setContext(c);
            }}
          />
          {!settings.apiKey.trim() ? (
            <div class="card warn">
              <b>Chưa có API key.</b> Vào <a href="#/settings">Cài đặt</a> để dán key.
            </div>
          ) : (
            <Button kind="primary" block onClick={onCreate} disabled={loading} loading={loading}>
              Tạo bài
            </Button>
          )}
        </>
      )}

      {phase === "playing" && lesson && (
        <>
          <h2>{lesson.title}</h2>
          <div class="row">
            <Button onClick={() => play(settings.ttsRate)} disabled={isSpeaking}>
              ▶ Nghe
            </Button>
            <Button onClick={() => play(settings.ttsRate * 0.7)} disabled={isSpeaking}>
              🐢 Chậm
            </Button>
            <Button onClick={stop} disabled={!isSpeaking}>
              ⏹ Dừng
            </Button>
          </div>
          <Button kind="primary" block onClick={() => setPhase("quiz")}>
            Làm câu hỏi
          </Button>
        </>
      )}

      {phase === "quiz" && lesson && (
        <>
          <h2>{lesson.title}</h2>
          {lesson.questions.map((q, qi) => (
            <div class="card" key={qi}>
              <p>{q.q}</p>
              {q.choices.map((c, ci) => (
                <div
                  key={ci}
                  class={`choice ${answers[qi] === ci ? "on" : ""}`}
                  onClick={() => pick(qi, ci)}
                >
                  {c}
                </div>
              ))}
            </div>
          ))}
          <Button kind="primary" block disabled={answers.some((a) => a === null)} onClick={submit}>
            Nộp
          </Button>
        </>
      )}

      {phase === "result" && lesson && (
        <>
          <div class="big">{score}%</div>
          {lesson.questions.map((q, qi) => (
            <div class="card" key={qi}>
              <p>{q.q}</p>
              {q.choices.map((c, ci) => (
                <div
                  key={ci}
                  class={`choice ${ci === q.answer ? "right" : ci === answers[qi] ? "wrong" : ""}`}
                >
                  {c}
                </div>
              ))}
            </div>
          ))}

          <h2>Bản ghi</h2>
          <Button onClick={() => setShowGloss(!showGloss)}>Xem bản dịch</Button>
          {showGloss && <p class="muted">{lesson.gloss_vi}</p>}
          <WordTap text={lesson.script} vocab={lesson.vocab} onSave={onSaveVocab} />

          <div class="row">
            <Button onClick={() => play(settings.ttsRate)} disabled={isSpeaking}>
              🔁 Nghe lại
            </Button>
            <Button kind="primary" onClick={reset}>
              Bài mới
            </Button>
          </div>
        </>
      )}
    </>
  );
}
