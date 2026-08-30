import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, SkipForward, Plus, Minus, Info, Minimize2, Maximize2 } from "lucide-react";
import { playRestCompletionBeep } from "../utils/sound";
import { safeSetItem, safeGetItem } from "../lib/storage";

interface RestTimerProps {
  key?: string | number;
  initialSeconds: number;
  type: "set" | "exercise";
  onClose: () => void;
  onTimeAdjusted?: (newTotal: number) => void;
  exerciseName?: string;
}

export default function RestTimer({ initialSeconds, type, onClose, onTimeAdjusted, exerciseName }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = safeGetItem("timer_sound_enabled");
    return saved !== "false"; // default to true
  });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsActive(true);
    setIsFinished(false);
  }, [initialSeconds]);

  useEffect(() => {
    let interval: any = null;

    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setIsFinished(true);
      if (soundEnabled) {
        playRestCompletionBeep();
      }
    }

    return () => clearInterval(interval);
  }, [isActive, secondsLeft, soundEnabled]);

  // Automatically return to the series list when the rest timer completes
  useEffect(() => {
    if (isFinished) {
      const autoCloseTimeout = setTimeout(() => {
        onClose();
      }, 1500); // 1.5 second delay to let the beep sequence finish and show completion state
      return () => clearTimeout(autoCloseTimeout);
    }
  }, [isFinished, onClose]);

  const toggleActive = () => setIsActive(!isActive);

  const resetTimer = () => {
    setSecondsLeft(totalSeconds);
    setIsActive(false);
    setIsFinished(false);
  };

  const adjustTime = (amount: number) => {
    setTotalSeconds((prev) => {
      return Math.max(10, prev + amount);
    });
    setSecondsLeft((prev) => Math.max(0, prev + amount));
    if (onTimeAdjusted) {
      onTimeAdjusted(Math.max(10, totalSeconds + amount));
    }
  };

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    safeSetItem("timer_sound_enabled", newVal.toString());
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Calculate percentage for circular progress
  const percentage = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const radius = 90;
  const strokeDashoffset = (percentage / 100) * (2 * Math.PI * radius);

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-24 right-4 z-[100] bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl flex items-center gap-4 cursor-pointer hover:border-zinc-700 transition-colors animate-in slide-in-from-bottom-5"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex flex-col items-center min-w-[3rem]">
            <span className={`text-xl font-mono font-black ${isFinished ? "text-red-400 animate-bounce" : secondsLeft < 20 ? "text-red-500 animate-pulse" : "text-white"}`}>
              {formatTime(secondsLeft)}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Descanso</span>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleActive(); }} 
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white transition-colors"
            >
                {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 transition-colors"
            >
                <SkipForward className="w-4 h-4" />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[100] flex flex-col items-center justify-between py-6 px-4 overflow-y-auto font-sans transition-all duration-500 animate-in fade-in zoom-in-95">
      
      {/* Background Pulsing Effect when Finished */}
      {isFinished && (
        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
      )}

      {/* Header controls */}
      <div className="w-full max-w-lg flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMinimized(true)} 
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className={`w-2 h-2 rounded-full ${isFinished ? "bg-red-500" : "bg-red-600"} animate-pulse ml-1`} />
          <span className="text-xs font-bold tracking-wider uppercase text-zinc-400 font-mono">
            {type === "exercise" ? "Descanso entre ejercicios" : "Descanso entre series"}
          </span>
        </div>
        <button
          onClick={handleToggleSound}
          className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title={soundEnabled ? "Silenciar" : "Activar sonido"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-red-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
        </button>
      </div>

      {/* Main Countdown Circle */}
      <div className="flex flex-col items-center justify-center my-2 shrink-0">
        
        {/* Giant Circle */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            {/* Background Track */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className="stroke-zinc-900"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Active Track */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className={`transition-all duration-1000 ${
                isFinished
                  ? "stroke-red-500"
                  : secondsLeft < 20
                  ? "stroke-red-600 animate-pulse"
                  : type === "exercise"
                  ? "stroke-red-500"
                  : "stroke-red-600"
              }`}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * radius}
              strokeDashoffset={2 * Math.PI * radius - strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Time display inside circle */}
          <div className="absolute flex flex-col items-center">
            <span className={`text-5xl sm:text-6xl font-mono font-black tracking-tighter ${
              isFinished 
                ? "text-red-400 animate-bounce" 
                : secondsLeft < 20 
                ? "text-red-500 animate-pulse" 
                : "text-white"
            }`}>
              {formatTime(secondsLeft)}
            </span>
            <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
              de {formatTime(totalSeconds)}
            </span>
          </div>
        </div>

        {/* Info/Motivation Panel */}
        <div className="mt-4 text-center max-w-md px-4">
          {isFinished ? (
            <div className="space-y-1">
              <span className="text-xl font-black text-red-400 tracking-tight block uppercase">
                ¡TIEMPO COMPLETADO!
              </span>
              <span className="text-sm text-zinc-300 block">
                Es hora de realizar tu siguiente serie con la técnica perfecta.
              </span>
            </div>
          ) : secondsLeft < 20 ? (
            <div className="space-y-1">
              <span className="text-lg font-black text-red-500 block animate-pulse uppercase tracking-wide">
                ¡PREPÁRATE!
              </span>
              <span className="text-xs text-zinc-400 block">
                Posiciónate, respira hondo y mentalízate.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-300 block">
                {type === "exercise" ? "Transición de ejercicio:" : "Recuperación en curso:"}
              </span>
              {exerciseName && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border bg-red-600/10 border-red-500/20 text-red-400">
                  {exerciseName}
                </span>
              )}
              <div className="flex justify-center items-center gap-1.5 text-xs text-zinc-500 max-w-xs mx-auto mt-1 bg-zinc-950 border border-zinc-900 p-2 rounded-xl">
                <Info className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span className="leading-tight">Recupera el aliento, hidrátate y mantén el foco mental.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adjustments & Actions block */}
      <div className="w-full max-w-lg space-y-4 shrink-0 pb-2">
        
        {/* Quick Time Adjusters (+/-) */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => adjustTime(-30)}
            className="flex-1 max-w-[70px] flex items-center justify-center gap-0.5 py-2 rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
          >
            -30s
          </button>
          <button
            onClick={() => adjustTime(-10)}
            className="p-2 rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => adjustTime(10)}
            className="p-2 rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => adjustTime(30)}
            className="flex-1 max-w-[70px] flex items-center justify-center gap-0.5 py-2 rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
          >
            +30s
          </button>
        </div>

        {/* Quick Preset Badges */}
        <div className="flex justify-center gap-1 max-w-md mx-auto">
          {[60, 90, 120, 180, 240, 300].map((presetSecs) => (
            <button
              key={presetSecs}
              onClick={() => {
                setTotalSeconds(presetSecs);
                setSecondsLeft(presetSecs);
                setIsActive(true);
                setIsFinished(false);
                if (onTimeAdjusted) {
                  onTimeAdjusted(presetSecs);
                }
              }}
              className={`px-2.5 py-1 text-[11px] rounded-xl font-mono transition-all cursor-pointer ${
                totalSeconds === presetSecs && !isFinished
                  ? "bg-red-600 text-white border border-red-500 shadow-md shadow-red-600/25"
                  : "bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {presetSecs / 60}m
            </button>
          ))}
        </div>

        {/* Main Controls row */}
        <div className="flex items-center gap-3 pt-1">
          
          {/* Reset button */}
          <button
            onClick={resetTimer}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-3 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <span>Reiniciar</span>
          </button>

          {/* Big central Play/Pause button */}
          <button
            onClick={toggleActive}
            disabled={isFinished}
            className={`p-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isFinished
                ? "bg-zinc-950 text-zinc-600 border border-zinc-900 cursor-not-allowed"
                : isActive
                ? "bg-red-700 hover:bg-red-800 text-white shadow-lg shadow-red-700/20 border border-red-500/30"
                : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 border border-red-500/40"
            }`}
          >
            {isActive ? <Pause className="w-5 sm:w-6 h-5 sm:h-6 fill-current" /> : <Play className="w-5 sm:w-6 h-5 sm:h-6 fill-current" />}
          </button>

          {/* Done/Close button */}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-3 bg-white text-black hover:bg-zinc-200 font-black text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider"
          >
            <SkipForward className="w-4 h-4 text-black" />
            <span>{isFinished ? "Aceptar" : "Saltar"}</span>
          </button>

        </div>
      </div>

    </div>
  );
}
