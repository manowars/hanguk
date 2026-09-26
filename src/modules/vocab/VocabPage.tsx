import { useEffect, useState } from "preact/hooks";
import type { PageProps } from "../../app";
import type { Card } from "../../types";
import { allCards, deleteCard, dueCards, saveCard } from "../../store/db";
import { review, type Quality } from "../../store/srs";
import { speak } from "../../speech/tts";
import { Button } from "../../ui/Button";
import { toastError } from "../../ui/Toast";
import { CONTEXT_LABEL } from "../../api/prompts/common";

type Tab = "due" | "all";

function formatDue(due: number, now: number): string {
  if (due <= now) return "hôm nay";
  const d = new Date(due);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function DueTab({ rate }: { rate: number }) {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    dueCards(Date.now())
      .then((cards) => {
        setQueue(cards);
        setTotal(cards.length);
      })
      .catch(toastError);
  }, []);

  if (queue === null) return null;

  if (total === 0) {
    return (
      <div class="card">
        <b>Hết thẻ hôm nay 🎉</b>
        <p class="muted">Thẻ mới được lưu khi bạn bấm "Lưu vào từ vựng" ở bài Nghe hoặc Đọc.</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div class="card ok">
        <p>Xong! Đã ôn {done} thẻ.</p>
        <Button kind="primary" block onClick={() => (location.hash = "/")}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  const card = queue[0];

  async function grade(q: Quality) {
    try {
      const updated = review(card, q, Date.now());
      await saveCard(updated);
      setQueue((cur) => (cur ? cur.slice(1) : cur));
      setDone((d) => d + 1);
      setRevealed(false);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <>
      <p class="muted">
        {done + 1}/{total}
      </p>
      <div class="card" onClick={() => setRevealed(true)}>
        <div class="row" style="justify-content:space-between">
          <span class="ko big">{card.ko}</span>
          <button
            class="iconbtn"
            aria-label="Nghe"
            onClick={(e) => {
              e.stopPropagation();
              speak(card.ko, rate).catch(toastError);
            }}
          >
            🔊
          </button>
        </div>
        {revealed ? (
          <>
            <p>{card.vi}</p>
            {card.example && <p class="muted">{card.example}</p>}
          </>
        ) : (
          <Button onClick={() => setRevealed(true)}>Hiện nghĩa</Button>
        )}
      </div>
      {revealed && (
        <div class="grid2">
          <Button kind="bad" onClick={() => grade(1)}>
            Quên
          </Button>
          <Button kind="warn" onClick={() => grade(3)}>
            Khó
          </Button>
          <Button onClick={() => grade(4)}>Được</Button>
          <Button kind="ok" onClick={() => grade(5)}>
            Dễ
          </Button>
        </div>
      )}
    </>
  );
}

function AllTab() {
  const [cards, setCards] = useState<Card[] | null>(null);

  function load() {
    allCards().then(setCards).catch(toastError);
  }

  useEffect(load, []);

  async function remove(id: string) {
    if (!confirm("Xóa thẻ này?")) return;
    try {
      await deleteCard(id);
      load();
    } catch (e) {
      toastError(e);
    }
  }

  if (cards === null) return null;

  if (cards.length === 0) {
    return <p class="muted">Chưa có thẻ nào.</p>;
  }

  const now = Date.now();
  return (
    <>
      <p class="muted">{cards.length} thẻ</p>
      {cards.map((c) => (
        <div key={c.id} class="card">
          <div class="row" style="justify-content:space-between">
            <div>
              <b>{c.ko}</b>
              <p>{c.vi}</p>
              <p class="muted">
                {CONTEXT_LABEL[c.context].vi} · hạn: {formatDue(c.due, now)}
              </p>
            </div>
            <button class="iconbtn" aria-label="Xóa" onClick={() => remove(c.id)}>
              🗑
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

export function VocabPage({ settings }: PageProps) {
  const [tab, setTab] = useState<Tab>("due");

  return (
    <>
      <div class="topbar">
        <h1>Từ vựng</h1>
        <a class="iconbtn" href="#/" aria-label="Đóng">
          ✕
        </a>
      </div>
      <div class="chips" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "due"}
          class={`chip ${tab === "due" ? "on" : ""}`}
          onClick={() => setTab("due")}
        >
          Ôn hôm nay
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          class={`chip ${tab === "all" ? "on" : ""}`}
          onClick={() => setTab("all")}
        >
          Tất cả
        </button>
      </div>
      {tab === "due" ? <DueTab rate={settings.ttsRate} /> : <AllTab />}
    </>
  );
}
