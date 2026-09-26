import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const NATIVE = Capacitor.isNativePlatform();

const VOICE_WAIT_MS = 1000;

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const done = () => resolve(s.getVoices());
      s.addEventListener("voiceschanged", done, { once: true });
      setTimeout(done, VOICE_WAIT_MS);
    });
  }
  return voicesReady;
}

async function koreanVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  const ko = voices.filter((v) => v.lang.toLowerCase().startsWith("ko"));
  return ko.find((v) => v.localService) ?? ko[0] ?? null;
}

export function hasKoreanVoice(): boolean {
  if (NATIVE) return true;
  const s = synth();
  return !!s && s.getVoices().some((v) => v.lang.toLowerCase().startsWith("ko"));
}

export function ttsSupported(): boolean {
  if (NATIVE) return true;
  return synth() !== null;
}

export function stopSpeaking(): void {
  if (NATIVE) void TextToSpeech.stop().catch(() => {});
  synth()?.cancel();
}

/** Speak Korean text. Resolves when finished or on error. */
export async function speak(text: string, rate: number): Promise<void> {
  if (NATIVE) {
    // Android TTS engine (Google). Resolves when finished; errors (e.g. no Korean voice data) are ignored.
    await TextToSpeech.speak({ text, lang: "ko-KR", rate, pitch: 1, volume: 1, category: "playback" }).catch(() => {});
    return;
  }
  const s = synth();
  if (!s) return;
  s.cancel();
  const voice = await koreanVoice();
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    s.speak(u);
  });
}
