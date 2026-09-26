import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const NATIVE = Capacitor.isNativePlatform();

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return NATIVE || ctor() !== null;
}

export type SttError = "unsupported" | "denied" | "no-speech" | "network" | "aborted" | "unknown";

let current: SpeechRecognitionLike | null = null;

export function stopListening(): void {
  if (NATIVE) void SpeechRecognition.stop().catch(() => {});
  current?.abort();
  current = null;
}

/** Listen once for Korean speech. Resolves with the transcript, rejects with an Error whose message is an SttError. */
export function listenOnce(): Promise<string> {
  if (NATIVE) return listenNative();
  const R = ctor();
  if (!R) return Promise.reject(new Error("unsupported"));
  stopListening();
  return new Promise((resolve, reject) => {
    const r = new R();
    current = r;
    r.lang = "ko-KR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      current = null;
      fn();
    };
    r.onresult = (e) => finish(() => resolve(e.results[0][0].transcript.trim()));
    r.onerror = (e) => {
      const map: Record<string, SttError> = {
        "not-allowed": "denied",
        "service-not-allowed": "denied",
        "no-speech": "no-speech",
        network: "network",
        aborted: "aborted",
      };
      finish(() => reject(new Error(map[e.error] ?? "unknown")));
    };
    r.onend = () => finish(() => reject(new Error("no-speech")));
    r.start();
  });
}

/** Android app: uses the system speech recognizer (Google) through the Capacitor plugin. */
async function listenNative(): Promise<string> {
  const perm = await SpeechRecognition.requestPermissions();
  if (perm.speechRecognition !== "granted") throw new Error("denied");
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error("unsupported");
  try {
    const r = await SpeechRecognition.start({ language: "ko-KR", maxResults: 1, partialResults: false, popup: false });
    const text = r.matches?.[0]?.trim();
    if (!text) throw new Error("no-speech");
    return text;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "no-speech" || /no match|no speech|timeout/i.test(m)) throw new Error("no-speech");
    if (/network/i.test(m)) throw new Error("network");
    throw new Error("unknown");
  }
}

export function sttErrorMessage(e: unknown): string {
  const code = e instanceof Error ? e.message : "unknown";
  const msg: Record<string, string> = {
    unsupported: "Trình duyệt này không nhận giọng nói. Hãy gõ chữ.",
    denied: NATIVE
      ? "Bạn chưa cho phép dùng mic. Vào Cài đặt Android → Ứng dụng → Hanguk → Quyền → Micrô."
      : "Bạn chưa cho phép dùng mic. Mở cài đặt trang web và bật mic.",
    "no-speech": "Không nghe thấy gì. Bấm mic rồi nói ngay.",
    network: "Nhận giọng nói cần mạng. Kiểm tra kết nối.",
    aborted: "Đã hủy.",
  };
  return msg[code] ?? "Lỗi mic không rõ. Thử lại.";
}
