/**
 * Web Audio API Sound Utility for Kinetic AI
 */

export function playRestCompletionBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("AudioContext is not supported in this browser.");
      return;
    }
    
    const audioCtx = new AudioContextClass();

    const playSingleBeep = (delay: number, frequency: number, duration: number, volume: number = 0.15) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay);

      // Smooth volume envelope to prevent clicking
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    // Professional triple-beep sequence: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    playSingleBeep(0, 523.25, 0.15, 0.12);    // Beep 1 (C5)
    playSingleBeep(0.2, 659.25, 0.15, 0.12);  // Beep 2 (E5)
    playSingleBeep(0.4, 783.99, 0.35, 0.15);  // Beep 3 (G5 - longer, higher pitch, slightly louder)

  } catch (error) {
    console.warn("Could not play timer sound:", error);
  }
}
