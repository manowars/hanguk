import { useEffect, useState } from "preact/hooks";
import type { PageProps } from "../app";
import { SKILLS, type Skill } from "../types";
import { dueCards } from "../store/db";
import { ContextPicker, loadContext, saveContext } from "../ui/ContextPicker";

const SKILL_UI: Record<Skill, { label: string; ic: string; href: string }> = {
  listen: { label: "Nghe", ic: "🎧", href: "#/listen" },
  speak: { label: "Nói", ic: "🎤", href: "#/shadow" },
  read: { label: "Đọc", ic: "📖", href: "#/read" },
  write: { label: "Viết", ic: "✍️", href: "#/write" },
};

export function HomePage({ settings }: PageProps) {
  const [due, setDue] = useState<number | null>(null);
  const [context, setContext] = useState(loadContext);

  useEffect(() => {
    dueCards(Date.now())
      .then((c) => setDue(c.length))
      .catch(() => setDue(0));
  }, []);

  return (
    <>
      <div class="topbar">
        <h1>한국어 · Hanguk</h1>
        <a class="iconbtn" href="#/settings" aria-label="Cài đặt">
          ⚙️
        </a>
      </div>

      {!settings.apiKey && (
        <div class="card warn">
          <b>Chưa có API key.</b> App cần key của Claude để tạo bài.{" "}
          <a href="#/settings">Vào Cài đặt</a> để dán key.
        </div>
      )}

      <h2>Bối cảnh hôm nay</h2>
      <ContextPicker
        value={context}
        onChange={(c) => {
          saveContext(c);
          setContext(c);
        }}
      />

      <a href="#/rehearse" style="text-decoration:none;color:inherit">
        <div class="card ok">
          <b>🎓 Tập bài giảng / thuyết trình</b>
          <div class="muted">Dán bài của bạn → Claude sửa lỗi → tập nói từng đoạn → nhận xét phát âm</div>
        </div>
      </a>

      <a href="#/vocab" style="text-decoration:none;color:inherit">
        <div class={`card ${due ? "ok" : ""}`}>
          <div class="row" style="justify-content:space-between">
            <span>
              <b>Ôn từ vựng</b>
              <div class="muted">{due === null ? "Đang đếm…" : due === 0 ? "Hết thẻ hôm nay" : `${due} thẻ đến hạn`}</div>
            </span>
            <span class="big">{due ?? "·"}</span>
          </div>
        </div>
      </a>

      <h2>Kỹ năng</h2>
      <div class="grid2">
        {SKILLS.map((k) => {
          const ui = SKILL_UI[k];
          const hist = settings.history[k];
          const last = hist.length ? hist[hist.length - 1] : null;
          return (
            <a key={k} href={ui.href} class="tile" style="text-decoration:none;color:inherit">
              <div style="font-size:26px">{ui.ic}</div>
              <div class="t">{ui.label}</div>
              <div class="muted">
                TOPIK {settings.levels[k]}
                {last !== null && ` · lần trước ${last}%`}
              </div>
            </a>
          );
        })}
      </div>
      <p class="muted" style="margin-top:14px">
        Nói có ba kiểu: <a href="#/shadow">Nhại câu</a>, <a href="#/roleplay">Đóng vai</a> và <a href="#/rehearse">Tập bài giảng</a>.
      </p>
    </>
  );
}
