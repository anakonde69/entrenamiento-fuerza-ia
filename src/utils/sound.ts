/**
 * Web Audio API Sound Utility for XOPATS
 */

export type SoundType = "triple" | "simple" | "doble" | "campana" | "grave";

export interface SoundSettings {
  enabled: boolean;
  volume: number;      // 0.0 – 1.0
  type: SoundType;
  vibration: boolean;
}

export const SOUND_PRESETS: { id: SoundType; label: string; emoji: string }[] = [
  { id: "triple",  label: "Triple ascendente", emoji: "🎵" },
  { id: "simple",  label: "Pitido simple",      emoji: "🔔" },
  { id: "doble",   label: "Doble pitido",        emoji: "🔔" },
  { id: "campana", label: "Campana",             emoji: "🛎️" },
  { id: "grave",   label: "Grave profundo",      emoji: "🔈" },
];

export function playRestCompletionBeep(settings?: Partial<SoundSettings>) {
  const vol  = settings?.volume  ?? 0.6;
  const type = settings?.type    ?? "triple";
  const vib  = settings?.vibration ?? false;

  // Vibración (móvil)
  if (vib && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "triple")     navigator.vibrate([120, 80, 120, 80, 250]);
      else if (type === "doble") navigator.vibrate([150, 100, 150]);
      else                       navigator.vibrate(300);
    } catch (_) {}
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("AudioContext is not supported in this browser.");
      return;
    }
    const audioCtx = new AudioContextClass();

    const beep = (delay: number, freq: number, dur: number, gain: number, wave: OscillatorType = "sine") => {
      const osc      = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + dur);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + dur + 0.05);
    };

    const v = Math.min(vol * 0.9, 0.9);

    switch (type) {
      case "triple":
        beep(0,   523.25, 0.15, v * 0.8);
        beep(0.2, 659.25, 0.15, v * 0.8);
        beep(0.4, 783.99, 0.35, v);
        break;
      case "simple":
        beep(0, 880, 0.5, v);
        break;
      case "doble":
        beep(0,   660, 0.2, v);
        beep(0.3, 880, 0.3, v);
        break;
      case "campana":
        beep(0,    1046, 0.05, v,        "triangle");
        beep(0.05, 1318, 0.6,  v * 0.6, "triangle");
        break;
      case "grave":
        beep(0,    110, 0.1, v,       "square");
        beep(0.15, 220, 0.4, v * 0.8, "sine");
        break;
    }
  } catch (error) {
    console.warn("Could not play timer sound:", error);
  }
}
