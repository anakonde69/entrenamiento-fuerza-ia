import { useState, useEffect } from "react";
import { 
  Play, CheckCircle2, ChevronRight, Sparkles, BookOpen, Clock, 
  HelpCircle, ChevronDown, ChevronUp, Plus, Trash2, Dumbbell, Settings, X, Volume2, RefreshCw, Trophy, Zap
} from "lucide-react";
import { Routine, Day, Exercise, WorkoutLog, ExerciseSetLog, MachineExercise } from "../types";
import TechniqueAnimation from "./TechniqueAnimation";
import RestTimer from "./RestTimer";
import ConfirmModal from "./ConfirmModal";
import { INITIAL_MACHINES } from "../utils/machines";
import { 
  calculateSessionMuscleFocus, 
  getExerciseCategories, 
  getCategoryBadge 
} from "../utils/muscleFocus";
import { playRestCompletionBeep } from "../utils/sound";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

interface WorkoutDashboardProps {
  routine: Routine;
  onLogSaved: (newLog: WorkoutLog) => void;
  onResetRoutine?: () => void;
  workoutLogs?: WorkoutLog[];
}

export default function WorkoutDashboard({ routine, onLogSaved, onResetRoutine, workoutLogs = [] }: WorkoutDashboardProps) {
  const [machines, setMachines] = useState<MachineExercise[]>([]);

  useEffect(() => {
    const q = query(collection(db, "machines"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: MachineExercise[] = [];
      snapshot.forEach(docSnap => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as MachineExercise);
      });
      setMachines(fetched);
    });
    return () => unsubscribe();
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [activeWorkout, setActiveWorkout] = useState<{
    day: Day;
    exercisesState: {
      [exerciseId: string]: {
        sets: ExerciseSetLog[];
      };
    };
  } | null>(() => {
    try {
      const saved = safeGetItem("active_routine_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Save active workout to localStorage in real-time
  useEffect(() => {
    if (activeWorkout) {
      safeSetItem("active_routine_session", JSON.stringify(activeWorkout));
    } else {
      safeRemoveItem("active_routine_session");
    }
  }, [activeWorkout]);

  const [activeRestSeconds, setActiveRestSeconds] = useState<number>(180);
  const [activeRestType, setActiveRestType] = useState<"set" | "exercise">("set");
  const [activeRestExerciseName, setActiveRestExerciseName] = useState<string>("");
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [selectedExerciseForGuide, setSelectedExerciseForGuide] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  
  // Exercise Swap states
  const [exerciseToSwap, setExerciseToSwap] = useState<Exercise | null>(null);
  const [swapReason, setSwapReason] = useState<string>("");
  const [swapMachineId, setSwapMachineId] = useState<string>("");
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);
  const [completedRoutineSummary, setCompletedRoutineSummary] = useState<{
    dayName: string;
    dayNumber: number;
    exercises: {
      name: string;
      category?: string | string[];
      completedSetsCount: number;
      totalSetsCount: number;
      maxWeight: number;
    }[];
    focus: {
      title: string;
      subtitle: string;
      primaryGroups: string[];
    };
    totalCompletedSets: number;
    totalVolume: number;
  } | null>(null);

  // Timer configurations with persistent storage (defaults are 3m / 180s and 4m / 240s)
  const [timerSetRest, setTimerSetRest] = useState<number>(() => {
    const saved = localStorage.getItem("timer_set_rest");
    return saved ? parseInt(saved) : 180;
  });

  const [timerExerciseRest, setTimerExerciseRest] = useState<number>(() => {
    const saved = localStorage.getItem("timer_exercise_rest");
    return saved ? parseInt(saved) : 240;
  });

  // Local state for options form inputs
  const [tempSetRest, setTempSetRest] = useState<number>(timerSetRest);
  const [tempExerciseRest, setTempExerciseRest] = useState<number>(timerExerciseRest);

  // Sync temp values whenever settings modal is shown
  useEffect(() => {
    if (showSettingsModal) {
      setTempSetRest(timerSetRest);
      setTempExerciseRest(timerExerciseRest);
    }
  }, [showSettingsModal, timerSetRest, timerExerciseRest]);

  const activeDay = routine.days[selectedDayIndex];

  // Initialize active workout state when a user starts a day
  const startWorkout = (day: Day) => {
    const exercisesState: {
      [exerciseId: string]: {
        sets: ExerciseSetLog[];
      };
    } = {};

    const savedWeightsStr = localStorage.getItem("exercise_weights");
    const savedWeights = savedWeightsStr ? JSON.parse(savedWeightsStr) : {};

    day.exercises.forEach((ex) => {
      // Find last performance in workout logs
      let lastPerfLog = workoutLogs?.find(l => l.exerciseId === ex.id);
      if (!lastPerfLog) {
        lastPerfLog = workoutLogs?.find(l => l.exerciseName === ex.name);
      }

      // Create empty sets based on ex.sets count
      const sets: ExerciseSetLog[] = Array.from({ length: ex.sets }, (_, i) => {
        const lastWeight = lastPerfLog?.sets?.[i]?.weight || savedWeights[ex.name] || 0;
        return {
          setNumber: i + 1,
          reps: parseInt(ex.reps) || 10,
          weight: lastWeight,
          completed: false,
        };
      });
      exercisesState[ex.id] = { sets };
    });

    setActiveWorkout({
      day,
      exercisesState,
    });
    setSelectedExerciseForGuide(day.exercises[0]?.id || null);
  };

  // Resume active workout from today's logs
  const resumeWorkout = (day: Day, dayLogsToday: WorkoutLog[]) => {
    const exercisesState: {
      [exerciseId: string]: {
        sets: ExerciseSetLog[];
      };
    } = {};

    const savedWeightsStr = localStorage.getItem("exercise_weights");
    const savedWeights = savedWeightsStr ? JSON.parse(savedWeightsStr) : {};

    day.exercises.forEach((ex) => {
      const existingLog = dayLogsToday.find(l => l.exerciseId === ex.id || l.exerciseName === ex.name);
      if (existingLog && Array.isArray(existingLog.sets) && existingLog.sets.length > 0) {
        exercisesState[ex.id] = {
          sets: existingLog.sets.map((s, idx) => ({
            setNumber: s.setNumber || idx + 1,
            reps: Number(s.reps) || 10,
            weight: Number(s.weight) || 0,
            completed: Boolean(s.completed),
            rir: s.rir
          }))
        };
      } else {
        const lastWeight = savedWeights[ex.name] || 0;
        const sets: ExerciseSetLog[] = Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: parseInt(ex.reps) || 10,
          weight: lastWeight,
          completed: false,
        }));
        exercisesState[ex.id] = { sets };
      }
    });

    setActiveWorkout({
      day,
      exercisesState,
    });
    setSelectedExerciseForGuide(day.exercises[0]?.id || null);
  };

  // Add a set to an exercise
  const addSet = (exerciseId: string) => {
    if (!activeWorkout) return;
    const currentSets = activeWorkout.exercisesState[exerciseId].sets;
    const nextSetNumber = currentSets.length + 1;
    const lastSet = currentSets[currentSets.length - 1];

    const newSet: ExerciseSetLog = {
      setNumber: nextSetNumber,
      reps: lastSet ? lastSet.reps : 10,
      weight: lastSet ? lastSet.weight : 0,
      completed: false,
    };

    setActiveWorkout({
      ...activeWorkout,
      exercisesState: {
        ...activeWorkout.exercisesState,
        [exerciseId]: {
          sets: [...currentSets, newSet],
        },
      },
    });
  };

  // Delete a set from an exercise
  const removeSet = (exerciseId: string, setIndex: number) => {
    if (!activeWorkout) return;
    const currentSets = activeWorkout.exercisesState[exerciseId].sets;
    if (currentSets.length <= 1) return; // Keep at least one set

    const updatedSets = currentSets.filter((_, i) => i !== setIndex).map((s, idx) => ({
      ...s,
      setNumber: idx + 1,
    }));

    setActiveWorkout({
      ...activeWorkout,
      exercisesState: {
        ...activeWorkout.exercisesState,
        [exerciseId]: {
          sets: updatedSets,
        },
      },
    });
  };

  // Update set values (reps or weight)
  const updateSet = (exerciseId: string, setIndex: number, fields: Partial<ExerciseSetLog>) => {
    if (!activeWorkout) return;
    const currentSets = activeWorkout.exercisesState[exerciseId].sets;
    const updatedSets = [...currentSets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      ...fields,
    };

    if (fields.weight !== undefined) {
      for (let i = setIndex + 1; i < updatedSets.length; i++) {
        if (!updatedSets[i].completed) {
          updatedSets[i] = { ...updatedSets[i], weight: fields.weight };
        }
      }
    }

    // Auto trigger rest timer if a set was checked as completed
    if (fields.completed === true) {
      const allSetsDoneForThisExercise = updatedSets.every(s => s.completed);
      const originalExercise = activeWorkout.day.exercises.find((ex) => ex.id === exerciseId);
      const exName = originalExercise ? originalExercise.name : "Siguiente ejercicio";

      if (allSetsDoneForThisExercise) {
        // Checked all sets for this exercise. Let's see if there is another uncompleted exercise.
        const otherExercises = activeWorkout.day.exercises.filter((ex) => ex.id !== exerciseId);
        const hasMoreExercises = otherExercises.some((ex) => {
          const exSets = activeWorkout.exercisesState[ex.id]?.sets || [];
          return !exSets.every(s => s.completed);
        });

        if (hasMoreExercises) {
          // Finished exercise and passing to another! Trigger exercise rest (default 4 mins / 240s)
          setActiveRestType("exercise");
          setActiveRestSeconds(timerExerciseRest);
          
          // Try to get the name of the next incomplete exercise
          const nextIncompleteEx = activeWorkout.day.exercises.find((ex) => {
            if (ex.id === exerciseId) return false;
            const exSets = activeWorkout.exercisesState[ex.id]?.sets || [];
            return !exSets.every(s => s.completed);
          });
          setActiveRestExerciseName(nextIncompleteEx ? nextIncompleteEx.name : "Siguiente ejercicio");
        } else {
          // No more exercises left or it's the final set of the day. Trigger normal set rest
          setActiveRestType("set");
          setActiveRestSeconds(timerSetRest);
          setActiveRestExerciseName(exName);
        }
      } else {
        // Just completed a normal set, not the last set of the exercise. Trigger series rest
        setActiveRestType("set");
        setActiveRestSeconds(timerSetRest);
        setActiveRestExerciseName(exName);
      }
      setShowRestTimer(true);
    }

    setActiveWorkout({
      ...activeWorkout,
      exercisesState: {
        ...activeWorkout.exercisesState,
        [exerciseId]: {
          sets: updatedSets,
        },
      },
    });
  };

  // Prompt confirmation before finishing workout
  const handlePromptFinishWorkout = () => {
    if (!activeWorkout) return;
    setConfirmDialog({
      message: "¿Estás seguro de que deseas finalizar la sesión de entrenamiento?",
      action: () => {
        handleFinishWorkout();
      }
    });
  };

  // Save current workout log
  const handleFinishWorkout = () => {
    if (!activeWorkout) return;

    const dateStr = new Date().toISOString().split("T")[0];
    const savedWeightsStr = localStorage.getItem("exercise_weights");
    const savedWeights = savedWeightsStr ? JSON.parse(savedWeightsStr) : {};

    const completedExercisesSummary: {
      name: string;
      category?: string | string[];
      completedSetsCount: number;
      totalSetsCount: number;
      maxWeight: number;
    }[] = [];

    let totalCompletedSets = 0;
    let totalVolume = 0;

    // Create logs for each exercise with completed sets
    Object.entries(activeWorkout.exercisesState).forEach(([exerciseId, val]) => {
      const state = val as { sets: ExerciseSetLog[] };
      const completedSets = state.sets.filter((s) => s.completed);
      if (completedSets.length === 0) return; // Skip if no sets completed

      const originalExercise = activeWorkout.day.exercises.find((ex) => ex.id === exerciseId);
      const exName = originalExercise ? originalExercise.name : "Ejercicio";

      // Match with machine database for category metadata
      const matchedMachine = machines.find((m) => m.id === exerciseId || m.name.toLowerCase() === exName.toLowerCase()) || 
        INITIAL_MACHINES.find((m) => m.id === exerciseId || m.name.toLowerCase() === exName.toLowerCase());

      // Save maximum weight used for this exercise to memory
      const maxWeight = Math.max(...completedSets.map(s => Number(s.weight) || 0), 0);
      if (maxWeight > 0) {
        savedWeights[exName] = maxWeight;
      }

      completedSets.forEach((s) => {
        totalCompletedSets++;
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });

      completedExercisesSummary.push({
        name: exName,
        category: matchedMachine?.category,
        completedSetsCount: completedSets.length,
        totalSetsCount: state.sets.length,
        maxWeight,
      });

      const newLog: WorkoutLog = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        date: dateStr,
        routineId: routine.id,
        dayNumber: activeWorkout.day.dayNumber,
        exerciseId,
        exerciseName: exName,
        sets: state.sets, // save all sets with their completion status
      };

      onLogSaved(newLog);
    });

    safeSetItem("exercise_weights", JSON.stringify(savedWeights));

    if (completedExercisesSummary.length > 0) {
      const focus = calculateSessionMuscleFocus(completedExercisesSummary);
      setCompletedRoutineSummary({
        dayName: activeWorkout.day.dayName,
        dayNumber: activeWorkout.day.dayNumber,
        exercises: completedExercisesSummary,
        focus,
        totalCompletedSets,
        totalVolume,
      });
    }

    // Reset active workout
    setActiveWorkout(null);
  };

  const handleSaveSettings = () => {
    setTimerSetRest(tempSetRest);
    setTimerExerciseRest(tempExerciseRest);
    safeSetItem("timer_set_rest", tempSetRest.toString());
    safeSetItem("timer_exercise_rest", tempExerciseRest.toString());
    setShowSettingsModal(false);
  };

  const handleSwapWithMachine = (machineId: string) => {
    if (!exerciseToSwap || !activeWorkout) return;
    const displayMachines = machines.length > 0 ? machines : INITIAL_MACHINES;
    const machine = displayMachines.find(m => m.id === machineId);
    if (!machine) return;

    const newExercise: Exercise = {
      id: machine.id,
      name: machine.name,
      sets: exerciseToSwap.sets,
      reps: exerciseToSwap.reps,
      suggestedWeight: "Según historial",
      techniqueInstructions: machine.description,
      animationType: "generic"
    };

    const updatedExercises = activeWorkout.day.exercises.map(ex => 
      ex.id === exerciseToSwap.id ? newExercise : ex
    );

    const updatedState = { ...activeWorkout.exercisesState };
    delete updatedState[exerciseToSwap.id];

    // Find last performance for this machine in workoutLogs
    const lastPerfLog = workoutLogs?.find(l => l.exerciseId === machine.id);
    
    updatedState[newExercise.id] = {
      sets: Array.from({ length: newExercise.sets }, (_, i) => {
        const lastSet = lastPerfLog?.sets?.[i];
        return {
          setNumber: i + 1,
          reps: parseInt(newExercise.reps) || 10,
          weight: lastSet?.weight || 0,
          completed: false,
        };
      })
    };

    setActiveWorkout({
      ...activeWorkout,
      day: {
        ...activeWorkout.day,
        exercises: updatedExercises
      },
      exercisesState: updatedState
    });

    if (selectedExerciseForGuide === exerciseToSwap.id) {
      setSelectedExerciseForGuide(newExercise.id);
    }
    setExerciseToSwap(null);
  };

  const handleSwapExercise = async () => {
    if (!exerciseToSwap || !activeWorkout || !swapReason.trim()) return;
    setIsSwapping(true);
    try {
      const res = await fetch("/api/alternative-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exerciseToSwap.name,
          reason: swapReason
        })
      });

      if (res.ok) {
        const newExercise = await res.json();
        
        // Replace in activeWorkout.day.exercises
        const updatedExercises = activeWorkout.day.exercises.map(ex => 
          ex.id === exerciseToSwap.id ? newExercise : ex
        );

        // Update exercisesState
        const updatedState = { ...activeWorkout.exercisesState };
        delete updatedState[exerciseToSwap.id];
        
        // Initialize state for new exercise
        updatedState[newExercise.id] = {
          sets: Array.from({ length: newExercise.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: parseInt(newExercise.reps) || 10,
            weight: 0,
            completed: false,
          }))
        };

        setActiveWorkout({
          ...activeWorkout,
          day: {
            ...activeWorkout.day,
            exercises: updatedExercises
          },
          exercisesState: updatedState
        });

        // If the swapped exercise was the selected one for guide, update it
        if (selectedExerciseForGuide === exerciseToSwap.id) {
          setSelectedExerciseForGuide(newExercise.id);
        }

        setExerciseToSwap(null);
        setSwapReason("");
      } else {
        alert("Hubo un error al generar la alternativa.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al cambiar el ejercicio.");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 relative">
      
      <ConfirmModal
        isOpen={confirmDialog !== null}
        message={confirmDialog?.message || ""}
        onConfirm={() => confirmDialog?.action()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* 1. If no active workout, display list of days in the routine */}
      {!activeWorkout ? (
        <div className="space-y-8">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{routine.routineName}</h2>
            </div>
            
            {/* Options button on main screen */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-zinc-500 hover:text-red-400 p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Opciones de Descanso"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Dumbbell className="w-5 h-5 text-red-500" />
              Selecciona un Día para Entrenar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routine.days.map((day, idx) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const dayLogsToday = (workoutLogs || []).filter(l => l.date === todayStr && l.routineId === routine.id && l.dayNumber === day.dayNumber);
                const isCompletedToday = dayLogsToday.length > 0;

                return (
                  <div 
                    key={day.dayNumber}
                    className={`bg-zinc-950 rounded-2xl border p-5 shadow-lg transition-all flex flex-col justify-between group ${
                      isCompletedToday 
                        ? "border-emerald-500/40 hover:border-emerald-500/60 hover:shadow-emerald-600/10" 
                        : "border-zinc-900 hover:shadow-red-600/10 hover:border-red-600/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-red-400 bg-red-600/10 border border-red-500/20 px-2 py-1 rounded">
                            DÍA {day.dayNumber}
                          </span>
                          {isCompletedToday && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Completado Hoy
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 font-medium font-mono">
                          {day.exercises.length} ejercicios
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2 group-hover:text-red-300 transition-colors">{day.dayName}</h4>
                      <ul className="text-xs text-zinc-400 space-y-1 mb-6">
                        {day.exercises.slice(0, 4).map((ex, i) => (
                          <li key={i} className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            {ex.name} ({ex.sets}x{ex.reps})
                          </li>
                        ))}
                        {day.exercises.length > 4 && (
                          <li className="text-zinc-500 pl-3">y {day.exercises.length - 4} más...</li>
                        )}
                      </ul>
                    </div>

                    {isCompletedToday ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedDayIndex(idx);
                            resumeWorkout(day, dayLogsToday);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Seguir / Reanudar Sesión</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDayIndex(idx);
                            startWorkout(day);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer font-mono"
                        >
                          <span>Empezar de nuevo desde cero</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedDayIndex(idx);
                          startWorkout(day);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-red-600 hover:text-white hover:border-red-600 text-zinc-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                      >
                        <span>Iniciar Entrenamiento</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 2. Active Workout Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main exercise log section (Left/Center) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-950 p-6 rounded-2xl border border-red-950/60 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-red-500 tracking-widest uppercase">
                  ENTRENAMIENTO EN CURSO
                </span>
                <h2 className="text-xl font-black text-white mt-1 font-sans uppercase">
                  {activeWorkout.day.dayName}
                </h2>
              </div>
              <div className="flex gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900 rounded-xl border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Ajustar tiempos de descanso"
                >
                  <Settings className="w-3.5 h-3.5 text-red-500" />
                  <span>Opciones</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog({
                      message: "¿Estás seguro de que quieres cancelar el entrenamiento actual? No se guardará tu progreso.",
                      action: () => {
                        setActiveWorkout(null);
                      }
                    });
                  }}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-900 rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePromptFinishWorkout}
                  className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Finalizar Día
                </button>
              </div>
            </div>

            {/* List of Exercises to Log */}
            <div className="space-y-6">
              {activeWorkout.day.exercises.map((ex) => {
                const isSelected = selectedExerciseForGuide === ex.id;
                const state = activeWorkout.exercisesState[ex.id];
                const matchedMachine = machines.find((m) => m.id === ex.id || m.name.toLowerCase() === ex.name.toLowerCase()) || 
                  INITIAL_MACHINES.find((m) => m.id === ex.id || m.name.toLowerCase() === ex.name.toLowerCase());
                const categories = getExerciseCategories({ name: ex.name, category: matchedMachine?.category });

                return (
                  <div 
                    key={ex.id}
                    className={`bg-zinc-950 rounded-2xl border transition-all ${
                      isSelected 
                        ? "border-red-600/50 shadow-xl shadow-red-600/5" 
                        : "border-zinc-900 hover:border-zinc-800"
                    }`}
                  >
                    {/* Header of Exercise */}
                    <div 
                      onClick={() => setSelectedExerciseForGuide(ex.id)}
                      className="p-5 flex justify-between items-start cursor-pointer select-none"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-red-400 bg-red-600/10 border border-red-500/20 px-2 py-0.5 rounded font-mono">
                            {ex.sets} series x {ex.reps} reps
                          </span>
                          <span className="text-xs font-medium text-zinc-500">
                            Peso sugerido: {ex.suggestedWeight}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-white">{ex.name}</h4>
                          <div className="flex items-center gap-1 flex-wrap">
                            {categories.map((cat, cIdx) => {
                              const badge = getCategoryBadge(cat);
                              return (
                                <span key={cIdx} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${badge.badgeClass}`}>
                                  <span className={`w-1 h-1 rounded-full ${badge.dotClass}`} />
                                  {cat}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExerciseToSwap(ex);
                          }}
                          title="Cambiar Ejercicio"
                          className="text-zinc-400 hover:text-red-400 p-1.5 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="text-red-500 hover:text-red-400 p-1.5 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer">
                          <BookOpen className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sets Logging Table */}
                    <div className="px-5 pb-5 border-t border-zinc-900 pt-4">
                      <div className="grid grid-cols-12 gap-2 text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-2 px-1 sm:px-3 font-mono">
                        <span className="col-span-2 text-left">Serie</span>
                        <span className="col-span-3">Peso</span>
                        <span className="col-span-3">Reps</span>
                        <span className="col-span-2">RIR</span>
                        <span className="col-span-2">Ok</span>
                      </div>
                      <div className="space-y-2">
                        {state?.sets.map((set, setIdx) => (
                          <div 
                            key={setIdx}
                            className={`grid grid-cols-12 gap-2 items-center text-center p-1 sm:p-1.5 rounded-xl transition-all border ${
                              set.completed 
                                ? "bg-red-600/15 border-red-500/30 text-red-300" 
                                : "hover:bg-zinc-900/60 border-transparent text-zinc-400"
                            }`}
                          >
                            <span className="col-span-2 text-left text-sm font-mono font-bold text-zinc-500 pl-1 sm:pl-3">
                              {set.setNumber}
                            </span>
                            {/* Weight input */}
                            <div className="col-span-3 flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={set.weight || ""}
                                placeholder="0"
                                disabled={set.completed}
                                onChange={(e) => updateSet(ex.id, setIdx, { weight: Number(e.target.value) })}
                                className="w-14 sm:w-16 px-1 sm:px-2 py-1.5 text-center text-xs sm:text-sm font-semibold rounded-lg border border-zinc-800 bg-black disabled:opacity-50 text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                              />
                            </div>
                            {/* Reps input */}
                            <div className="col-span-3 flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={set.reps || ""}
                                placeholder="0"
                                disabled={set.completed}
                                onChange={(e) => updateSet(ex.id, setIdx, { reps: Number(e.target.value) })}
                                className="w-14 sm:w-16 px-1 sm:px-2 py-1.5 text-center text-xs sm:text-sm font-semibold rounded-lg border border-zinc-800 bg-black disabled:opacity-50 text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                              />
                            </div>
                            {/* RIR select */}
                            <div className="col-span-2 flex items-center justify-center">
                              <select
                                value={set.rir || ""}
                                disabled={set.completed}
                                onChange={(e) => updateSet(ex.id, setIdx, { rir: e.target.value })}
                                className="w-full max-w-[60px] px-1 py-1.5 text-center text-[10px] sm:text-xs font-semibold rounded-lg border border-zinc-800 bg-black disabled:opacity-50 text-white focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none text-center"
                                style={{ textAlignLast: "center" }}
                              >
                                <option value="">-</option>
                                <option value="RIR 5">RIR 5</option>
                                <option value="RIR 4">RIR 4</option>
                                <option value="RIR 3">RIR 3</option>
                                <option value="RIR 2">RIR 2</option>
                                <option value="RIR 1">RIR 1</option>
                                <option value="RIR 0">RIR 0</option>
                                <option value="FALLO">FALLO</option>
                              </select>
                            </div>
                            {/* Done check */}
                            <div className="col-span-2 flex items-center justify-center relative">
                              {state.sets.length > 1 && !set.completed && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, setIdx)}
                                  className="absolute -left-3 sm:-left-5 text-zinc-600 hover:text-red-400 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, setIdx, { completed: !set.completed })}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                                  set.completed
                                    ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                                    : "border-zinc-800 bg-black hover:border-red-500 text-transparent"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Set Button */}
                      <button
                        type="button"
                        onClick={() => addSet(ex.id)}
                        className="mt-3 flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 pl-3 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Serie
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panels (Right Column): Timer & Interactive Technique Animation */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Rest Timer panel */}
            <div className="bg-zinc-950 rounded-2xl shadow-xl border border-zinc-900 overflow-hidden">
              <div 
                className="bg-black p-4 border-b border-zinc-900 flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-bold text-zinc-300 font-sans uppercase">Control de Descanso</span>
                </div>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded transition-colors"
                  title="Configurar tiempos de descanso"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-900">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider mb-1 font-mono">Series</span>
                    <span className="text-sm font-mono font-black text-red-400">{Math.floor(timerSetRest / 60)}:{(timerSetRest % 60).toString().padStart(2, "0")}m</span>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-900">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider mb-1 font-mono">Ejercicios</span>
                    <span className="text-sm font-mono font-black text-red-500">{Math.floor(timerExerciseRest / 60)}:{(timerExerciseRest % 60).toString().padStart(2, "0")}m</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setActiveRestType("set");
                      setActiveRestSeconds(timerSetRest);
                      setActiveRestExerciseName("Descanso Manual");
                      setShowRestTimer(true);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-600/50 hover:bg-zinc-850 text-zinc-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span>Descanso Serie</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveRestType("exercise");
                      setActiveRestSeconds(timerExerciseRest);
                      setActiveRestExerciseName("Descanso Manual");
                      setShowRestTimer(true);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-600/50 hover:bg-zinc-850 text-zinc-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    <span>Descanso Ejercicio</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Technique / Guide panel */}
            {selectedExerciseForGuide && (
              (() => {
                const selectedExercise = activeWorkout.day.exercises.find((ex) => ex.id === selectedExerciseForGuide);
                if (!selectedExercise) return null;

                return (
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
                    <div className="flex items-center gap-2 text-red-500">
                      <Sparkles className="w-4 h-4 animate-spin-slow" />
                      <h3 className="text-xs font-extrabold uppercase tracking-widest">Asistente de Técnica Panatta</h3>
                    </div>

                    <h4 className="text-base font-bold text-white">
                      {selectedExercise.name}
                    </h4>

                    {/* Technique Correct Animation Render */}
                    <TechniqueAnimation type={selectedExercise.animationType} />

                    <div className="bg-red-950/20 border border-red-600/20 p-4 rounded-xl">
                      <h5 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
                        <BookOpen className="w-3 h-3" />
                        Consejos de ejecución:
                      </h5>
                      <p className="text-xs text-zinc-400 leading-relaxed font-medium italic">
                        "{selectedExercise.techniqueInstructions}"
                      </p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* 3. Full-Screen Rest Timer Overlay */}
      {showRestTimer && (
        <RestTimer 
          initialSeconds={activeRestSeconds}
          type={activeRestType}
          exerciseName={activeRestExerciseName}
          onClose={() => setShowRestTimer(false)} 
        />
      )}

      {/* 4. Options / Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-500">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-black text-white uppercase">Opciones de Descanso</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Configura los tiempos de descanso automáticos para optimizar tu recuperación durante el entrenamiento.
            </p>

            {/* Set Rest Settings */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Descanso entre series:
                </span>
                <span className="text-red-400 font-mono font-black text-sm">
                  {Math.floor(tempSetRest / 60)}m {tempSetRest % 60}s
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempSetRest(prev => Math.max(10, prev - 30))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-black text-xs font-mono font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  -30s
                </button>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="10"
                  value={tempSetRest}
                  onChange={(e) => setTempSetRest(Number(e.target.value))}
                  className="flex-1 accent-red-500 bg-black rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setTempSetRest(prev => Math.min(600, prev + 30))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-black text-xs font-mono font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  +30s
                </button>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5">
                {[60, 90, 120, 180, 240, 300].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTempSetRest(val)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg font-mono cursor-pointer ${
                      tempSetRest === val
                        ? "bg-red-600/20 border border-red-500 text-red-400"
                        : "bg-black border border-zinc-850 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {val / 60}m {val % 60 > 0 ? `${val % 60}s` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Rest Settings */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Descanso entre ejercicios:
                </span>
                <span className="text-red-500 font-mono font-black text-sm">
                  {Math.floor(tempExerciseRest / 60)}m {tempExerciseRest % 60}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempExerciseRest(prev => Math.max(10, prev - 30))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-black text-xs font-mono font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  -30s
                </button>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="10"
                  value={tempExerciseRest}
                  onChange={(e) => setTempExerciseRest(Number(e.target.value))}
                  className="flex-1 accent-red-600 bg-black rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setTempExerciseRest(prev => Math.min(600, prev + 30))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-black text-xs font-mono font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  +30s
                </button>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5">
                {[120, 180, 240, 300, 360, 480].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTempExerciseRest(val)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg font-mono cursor-pointer ${
                      tempExerciseRest === val
                        ? "bg-red-600/20 border border-red-500 text-red-400"
                        : "bg-black border border-zinc-850 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {val / 60}m {val % 60 > 0 ? `${val % 60}s` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Beep and Audio controls */}
            <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-sans">Prueba de audio</span>
              <button
                type="button"
                onClick={() => playRestCompletionBeep()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>Probar pitido</span>
              </button>
            </div>

            {/* Routine Management */}
            {onResetRoutine && (
              <div className="border-t border-zinc-900 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onResetRoutine();
                  }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl border border-red-600/30 hover:bg-red-950/20 text-red-400 text-xs font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cambiar Plan de Entrenamiento
                </button>
                <p className="text-[10px] text-zinc-500 text-center mt-2 leading-relaxed">
                  Usa esta opción si has cambiado de objetivo, disponibilidad de días o quieres una rutina totalmente nueva.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/25 cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Swap Exercise Modal */}
      {exerciseToSwap && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isSwapping) setExerciseToSwap(null);
              }}
              disabled={isSwapping}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-500">
              <RefreshCw className={`w-5 h-5 ${isSwapping ? 'animate-spin' : ''}`} />
              <h3 className="text-lg font-black text-white uppercase">Cambiar Ejercicio</h3>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-zinc-400">
                Vas a reemplazar <strong className="text-white">{exerciseToSwap.name}</strong>. Puedes elegir una máquina de tu catálogo libre o pedir una alternativa inteligente a la IA.
              </p>
              
              {/* Option 1: Swap from Catalog */}
              <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Catálogo de Máquinas
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={swapMachineId}
                    onChange={(e) => setSwapMachineId(e.target.value)}
                    disabled={isSwapping}
                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Selecciona una máquina...</option>
                    {(machines.length > 0 ? machines : INITIAL_MACHINES).map((m, index) => (
                      <option key={m.id || `machine-${index}`} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSwapWithMachine(swapMachineId)}
                    disabled={!swapMachineId || isSwapping}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800"></div>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Alternativa IA</span>
                <div className="flex-1 h-px bg-zinc-800"></div>
              </div>

              {/* Option 2: Swap with AI */}
              <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Motor Inteligente
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    disabled={isSwapping}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500 disabled:opacity-50"
                  >
                    <option value="">Motivo del cambio...</option>
                    <option value="No tengo el material o equipo necesario.">Falta de equipo / material</option>
                    <option value="Tengo una lesión o me causa dolor al realizarlo.">Lesión o dolor</option>
                    <option value="Me resulta demasiado difícil, necesito algo más fácil.">Demasiado difícil</option>
                    <option value="Me resulta demasiado fácil, necesito un reto mayor.">Demasiado fácil</option>
                    <option value="Simplemente prefiero otra variante para este músculo.">Prefiero otra variante</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSwapExercise}
                    disabled={isSwapping || !swapReason}
                    className="w-full py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSwapping ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <span>Generar Alternativa</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setExerciseToSwap(null)}
                  disabled={isSwapping}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CELEBRACIÓN DE RUTINA / DÍA COMPLETADO */}
      {completedRoutineSummary && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl max-w-lg w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-300 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-black text-red-500 tracking-wider uppercase bg-red-950/60 px-3 py-1 rounded-full border border-red-500/30">
                ¡Día {completedRoutineSummary.dayNumber} Completado!
              </span>
              <button 
                onClick={() => setCompletedRoutineSummary(null)}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dynamic Muscle Focus Banner */}
            <div className="bg-gradient-to-r from-red-950/50 via-zinc-900/70 to-zinc-950 border border-red-500/30 rounded-2xl p-4 text-left space-y-2 shadow-inner">
              <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>Enfoque Muscular de la Sesión</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                {completedRoutineSummary.focus.title}
              </h2>
              <p className="text-xs text-zinc-400">
                {completedRoutineSummary.focus.subtitle}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {completedRoutineSummary.focus.primaryGroups.map((grp, gIdx) => {
                  const badge = getCategoryBadge(grp);
                  return (
                    <span key={gIdx} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${badge.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                      {grp}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Día Rutina</span>
                <span className="text-xs font-mono font-bold text-red-400 truncate block">
                  {completedRoutineSummary.dayName}
                </span>
              </div>
              <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Ejercicios</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {completedRoutineSummary.exercises.length}
                </span>
              </div>
              <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Series Totales</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  {completedRoutineSummary.totalCompletedSets} series
                </span>
              </div>
            </div>

            {/* List of completed exercises with categories */}
            <div className="flex-1 overflow-y-auto pr-1 text-left space-y-2 min-h-0 max-h-56">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                <span>Ejercicios / Máquinas</span>
                <span className="text-[10px] text-zinc-500 font-normal">Grupo Muscular</span>
              </div>

              <div className="space-y-2">
                {completedRoutineSummary.exercises.map((ex, idx) => {
                  const categories = getExerciseCategories(ex);

                  return (
                    <div 
                      key={idx} 
                      className="bg-black/70 border border-zinc-850 hover:border-zinc-700 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-red-500 font-mono text-xs font-black">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-white truncate">{ex.name}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {categories.map((cat, cIdx) => {
                              const badge = getCategoryBadge(cat);
                              return (
                                <span key={cIdx} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${badge.badgeClass}`}>
                                  <span className={`w-1 h-1 rounded-full ${badge.dotClass}`} />
                                  {cat}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <span className="text-[11px] font-mono font-bold text-zinc-200 block">
                          {ex.completedSetsCount} / {ex.totalSetsCount} series
                        </span>
                        {ex.maxWeight > 0 && (
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                            Máx {ex.maxWeight} kg
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2">
              <button
                onClick={() => setCompletedRoutineSummary(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
