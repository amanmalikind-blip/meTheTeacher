"use client";

export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") return html;
  const el = document.createElement("div");
  el.innerHTML = html;
  // Drop <details> quiz answers so we don't spoil them aloud
  el.querySelectorAll("details").forEach((d) => {
    const summary = d.querySelector("summary");
    d.replaceWith(
      document.createTextNode(summary ? `${summary.textContent ?? ""}. ` : "")
    );
  });
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function onVoicesChanged(cb: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return () => undefined;
  }
  window.speechSynthesis.addEventListener("voiceschanged", cb);
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", cb);
}

export function speak(
  text: string,
  options: { voiceURI?: string; lang?: string; rate?: number }
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  if (options.lang) utter.lang = options.lang;
  if (options.rate) utter.rate = options.rate;
  if (options.voiceURI) {
    const voice = listVoices().find((v) => v.voiceURI === options.voiceURI);
    if (voice) utter.voice = voice;
  }
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
