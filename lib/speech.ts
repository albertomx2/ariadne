import type { SpeechVoice } from "@/lib/ariadne-store";

type SpeechOptions = {
  rate: number;
  voice: SpeechVoice;
  language: string;
  onStatus?: (status: "speaking" | "ready") => void;
};

function preferredSystemVoice(language: string) {
  const voices = window.speechSynthesis.getVoices();
  const requested = language.toLowerCase();
  const priorities = [
    "Ava (Premium)",
    "Samantha",
    "Ava",
    "Google US English",
    "Microsoft Ava",
    "Microsoft Jenny",
  ];
  return (
    priorities
      .map((name) => voices.find((voice) => voice.name.includes(name)))
      .find(Boolean) ??
    voices.find((voice) => voice.lang.toLowerCase() === requested) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function preloadNaturalSpeech() {
  if (typeof window === "undefined") return;
  // Reading the voice list once warms the operating-system speech service.
  window.speechSynthesis.getVoices();
}

export function stopSpeech() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

export async function speakNaturally(text: string, options: SpeechOptions) {
  if (!text.trim() || typeof window === "undefined") return;
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate;
  utterance.lang = options.language;
  utterance.pitch = 1;
  const voice = preferredSystemVoice(options.language);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => options.onStatus?.("speaking");
  utterance.onend = () => options.onStatus?.("ready");
  utterance.onerror = () => options.onStatus?.("ready");
  // Give immediate visual feedback and invoke the device TTS in the same user
  // gesture. There is no model download, network request, or generated-audio wait.
  options.onStatus?.("speaking");
  synthesis.speak(utterance);
  synthesis.resume();
}
