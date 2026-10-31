/**
 * Web Audio API Sound Utility for XOPATS
 * — Volumen máximo con DynamicsCompressor para evitar distorsión
 * — Vibración robusta en Android/iOS (patrón largo + fuerte)
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

/** Vibración robusta: patrón largo para que se note incluso en modo silencio */
function triggerVibration(type: SoundType) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    switch (type) {
      case "triple":
        navigator.vibrate([200, 100, 200, 100, 400]);
        break;
      case "doble":
        navigator.vibrate([300, 150, 300]);
        break;
      case "campana":
        navigator.vibrate([500]);
        break;
      case "grave":
        navigator.vibrate([600]);
        break;
      default:
        navigator.vibrate([400]);
    }
  } catch (_) {}
}

export function playRestCompletionBeep(settings?: Partial<SoundSettings>) {
  const vol  = settings?.volume    ?? 1.0;   // volumen máximo por defecto
  const type = settings?.type      ?? "triple";
  const vib  = settings?.vibration ?? false;

  // Vibración — se ejecuta siempre si está activada, independiente del audio
  if (vib) triggerVibration(type);

  if (!(settings?.enabled ?? true)) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // Compresor actuando como limiter: permite subir gain sin distorsión
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-6, audioCtx.currentTime);
    compressor.knee.setValueAtTime(4, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(2, audioCtx.currentTime);  // menos compresión → más volumen percibido
    compressor.attack.setValueAtTime(0.001, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.05, audioCtx.currentTime);

    // Ganancia maestra DESPUÉS del compresor para un boost final sin distorsión
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(2.0, audioCtx.currentTime);
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    const beep = (
      delay: number,
      freq: number,
      dur: number,
      gainVal: number,
      wave: OscillatorType = "sine"
    ) => {
      const osc      = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(compressor);

      osc.type = wave;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

      const g = Math.min(gainVal, 1.0);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(g, audioCtx.currentTime + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + dur);

      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + dur + 0.05);
    };

    // v es el gain real — sin factores reductores adicionales
    const v = Math.max(0.01, Math.min(vol, 1.0));

    switch (type) {
      case "triple":
        beep(0,    523.25, 0.25, v * 1.4);
        beep(0.30, 659.25, 0.28, v * 1.6);
        beep(0.62, 880.00, 0.70, v * 2.0);
        break;
      case "simple":
        beep(0, 880, 0.8, v * 2.0);
        break;
      case "doble":
        beep(0,    660, 0.30, v * 1.6);
        beep(0.36, 880, 0.55, v * 2.0);
        break;
      case "campana":
        beep(0,    1046, 0.06, v * 2.0, "triangle");
        beep(0.08, 1318, 0.90, v * 1.4, "triangle");
        break;
      case "grave":
        beep(0,    110, 0.18, v * 2.0, "square");
        beep(0.22, 220, 0.65, v * 1.6, "sine");
        break;
    }
  } catch (error) {
    console.warn("Could not play timer sound:", error);
  }
}
