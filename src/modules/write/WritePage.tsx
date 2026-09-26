import { useEffect, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { WriteReview, WriteTask } from "../../api/prompts/write";
import { finishLesson } from "../../store/progress";
import { speak } from "../../speech/tts";
import { ContextPicker, loadContext, saveContext } from "../../ui/ContextPicker";
import { Button } from "../../ui/Button";
import { useAsync } from "../../ui/useAsync";
import type { Context } from "../../types";
import { getTask, reviewText, wordCount } from "./flow";

const DRAFT_KEY = "hanguk.write.draft";
const MIN_WORDS = 10;
const TARGET_MIN = 80;
const TARGET_MAX = 150;

type Stage = "idle" | "loading" | "writing" | "reviewing" | "result";

function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(text: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, text);
  } catch {
    /* ignore */
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function WritePage({ settings, setSettings }: PageProps) {
  const [context, setContext] = useState<Context>(loadContext);
  const [stage, setStage] = useState<Stage>("idle");
  const [task, setTask] = useState<WriteTask | null>(null);
  const [text, setText] = useState("");
  const [review, setReview] = useState<WriteReview | null>(null);
  const taskAsync = useAsync(getTask);
  const reviewAsync = useAsync(reviewText);

  useEffect(() => {
    setText(loadDraft());
  }, []);

  useEffect(() => {
    saveContext(context);
  }, [context]);

  const hasKey = !!settings.apiKey.trim();

  async function requestTask() {
    setStage("loading");
    const t = await taskAsync.run(settings, context);
    if (t) {
      setTask(t);
      setStage("writing");
    } else {
      setStage("idle");
    }
  }

  function onTextChange(v: string) {
    setText(v);
    saveDraft(v);
  }

  async function submit() {
    if (!task) return;
    setStage("reviewing");
    const r = await reviewAsync.run(settings, context, task, text);
    if (r) {
      setReview(r);
      setStage("result");
      const next = await finishLesson(settings, "write", context, (r.score / 5) * 100);
      setSettings(next);
    } else {
      setStage("writing");
    }
  }

  function reset() {
    setTask(null);
    setReview(null);
    setText("");
    clearDraft();
    setStage("idle");
  }

  const words = wordCount(text);

  return (
    <div>
      <div class="topbar">
        <h1>Viết</h1>
        <a class="iconbtn" href="#/" aria-label="Về trang chủ">
          ✕
        </a>
      </div>

      {!hasKey && (
        <div class="card warn">
          Chưa có API key.{" "}
          <a href="#/settings">Vào Cài đặt</a> để dán key.
        </div>
      )}

      {(stage === "idle" || stage === "loading") && (
        <>
          <ContextPicker value={context} onChange={setContext} />
          <Button kind="primary" block onClick={requestTask} disabled={!hasKey} loading={stage === "loading"}>
            Lấy đề bài
          </Button>
        </>
      )}

      {(stage === "writing" || stage === "reviewing") && task && (
        <>
          <div class="card">
            <p>
              <strong>{task.task_vi}</strong>
            </p>
            <p class="ko">{task.task_ko}</p>
            {task.hints.length > 0 && (
              <div class="chips">
                {task.hints.map((h) => (
                  <span class="chip" key={h}>
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={text}
            placeholder="Viết bằng tiếng Hàn..."
            disabled={stage === "reviewing"}
            onInput={(e) => onTextChange((e.target as HTMLTextAreaElement).value)}
          />
          <p class="muted">
            {words} từ (mục tiêu {TARGET_MIN}-{TARGET_MAX})
          </p>

          <div class="row">
            <Button kind="primary" onClick={submit} disabled={words < MIN_WORDS} loading={stage === "reviewing"}>
              Chấm bài
            </Button>
            <Button onClick={requestTask} disabled={stage === "reviewing"}>
              Đề khác
            </Button>
          </div>
        </>
      )}

      {stage === "result" && review && (
        <>
          <div class="stars">{"★".repeat(review.score) + "☆".repeat(5 - review.score)}</div>
          <p>{review.comment_vi}</p>

          <div class="card">
            <p class="muted">Bản sửa</p>
            <p class="ko" style="white-space:pre-wrap">
              {review.corrected}
            </p>
          </div>

          {review.edits.length > 0 ? (
            review.edits.map((e, i) => (
              <div class="edit" key={i}>
                <p>
                  <span class="from">{e.from}</span> → <span class="to">{e.to}</span>
                </p>
                <p class="muted">{e.why_vi}</p>
              </div>
            ))
          ) : (
            <p>Không cần sửa gì 🎉</p>
          )}

          <div class="row">
            <Button onClick={() => speak(review.corrected, settings.ttsRate)}>🔊 Đọc bản sửa</Button>
            <Button kind="primary" onClick={reset}>
              Bài mới
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
