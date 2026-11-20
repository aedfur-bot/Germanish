// Device text-to-speech (Web Speech API). Works offline on Android if a German
// voice is installed (Settings → Text-to-speech on the phone).
import { getSettings } from './store.js';

export function ttsAvailable() { return 'speechSynthesis' in window; }

let voicesP = null;
export function germanVoices() {
  if (!ttsAvailable()) return Promise.resolve([]);
  voicesP ||= new Promise((resolve) => {
    const pick = () => speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('de'));
    const now = pick();
    if (now.length) return resolve(now);
    speechSynthesis.addEventListener('voiceschanged', () => resolve(pick()), { once: true });
    setTimeout(() => resolve(pick()), 1500);
  });
  return voicesP;
}

/** Speak German text. Resolves when finished (or immediately if TTS is unavailable). */
export async function speak(text, { rate } = {}) {
  if (!ttsAvailable() || !text) return;
  const s = await getSettings();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = rate ?? s.ttsRate ?? 0.9;
  const voices = await germanVoices();
  u.voice = voices.find((v) => v.voiceURI === s.ttsVoice) || voices[0] || null;
  return new Promise((resolve) => { u.onend = u.onerror = () => resolve(); speechSynthesis.speak(u); });
}

export function stopSpeaking() { if (ttsAvailable()) speechSynthesis.cancel(); }
