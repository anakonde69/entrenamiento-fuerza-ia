import React, { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Plus, Play, Pause, Square, Clock, Calendar as CalendarIcon, 
  Search, Filter, Image as ImageIcon, Trash2, CheckCircle2, 
  RotateCcw, Trophy, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Flame, Sparkles, 
  Dumbbell, History, Upload, Layers, Check, Info, AlertCircle, Camera, Edit2,
  HeartPulse, Activity, Zap, Timer, Gauge, X, Maximize2, ExternalLink, Eye, FileText
} from "lucide-react";
import { 
  MachineExercise, 
  ActiveFreeExercise, 
  FreeExerciseSet, 
  CardioBlock,
  FreeWorkoutLog, 
  ExerciseLastPerformance 
} from "../types";
import { INITIAL_MACHINES } from "../utils/machines";
import { 
  calculateSessionMuscleFocus, 
  getExerciseCategories, 
  getCategoryBadge 
} from "../utils/muscleFocus";
import RestTimer from "./RestTimer";
import ConfirmModal from "./ConfirmModal";

import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType, cleanForFirestore } from "../lib/firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";

interface FreeWorkoutProps {
  user: User;
  onLogSaved?: (log: FreeWorkoutLog) => void;
  activeTopTab?: "freeworkout" | "calendar" | "plan";
}

const PRESET_MACHINE_PHOTOS = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1578768079052-aa76e520028b?q=80&w=600&auto=format&fit=crop", // Treadmill
  "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=600&auto=format&fit=crop", // Bike
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop"  // Rower
];


const MachineImageCarousel = ({ imageUrls, onImageClick }: { imageUrls: string[], onImageClick?: (index: number) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const cleanUrls = (imageUrls || []).filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  const activeUrls = cleanUrls.length > 0 ? cleanUrls : [PRESET_MACHINE_PHOTOS[0]];

  if (activeUrls.length === 1) {
    return (
      <img 
        src={activeUrls[0]} 
        alt="Machine" 
        onClick={(e) => {
          if (onImageClick) {
            e.stopPropagation();
            e.preventDefault();
            onImageClick(0);
          }
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" 
      />
    );
  }

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? activeUrls.length - 1 : prev - 1));
  };
  
  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % activeUrls.length);
  };

  return (
    <div className="relative w-full h-full group/carousel overflow-hidden">
      <img 
        key={currentIndex}
        src={activeUrls[currentIndex] || PRESET_MACHINE_PHOTOS[0]} 
        alt="Machine" 
        onClick={(e) => {
          if (onImageClick) {
            e.stopPropagation();
            e.preventDefault();
            onImageClick(currentIndex);
          }
        }}
        className="w-full h-full object-cover animate-in fade-in duration-300 group-hover:scale-105 transition-transform cursor-pointer" 
      />
      
      {/* Navigation Arrows */}
      <div className="absolute inset-y-0 left-0 flex items-center px-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
        <button 
          onClick={goToPrev}
          className="bg-black/60 hover:bg-black text-white p-1 rounded-full cursor-pointer backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      
      <div className="absolute inset-y-0 right-0 flex items-center px-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
        <button 
          onClick={goToNext}
          className="bg-black/60 hover:bg-black text-white p-1 rounded-full cursor-pointer backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full">
        {imageUrls.map((_, idx) => (
          <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
};

const isCardioCategory = (category?: string | string[]): boolean => {
  if (!category) return false;
  if (Array.isArray(category)) {
    return category.some(c => typeof c === "string" && c.toLowerCase().includes("cardio"));
  }
  return typeof category === "string" && category.toLowerCase().includes("cardio");
};

const formatCategories = (category?: string | string[]): string => {
  if (!category) return "Fuerza";
  if (Array.isArray(category)) {
    return category.filter(Boolean).join(" • ") || "Fuerza";
  }
  return category || "Fuerza";
};

const getCategoryList = (category?: string | string[]): string[] => {
  if (!category) return ["Fuerza"];
  if (Array.isArray(category)) return category.filter(Boolean).length > 0 ? category.filter(Boolean) : ["Fuerza"];
  return [category];
};

const CARDIO_LEVELS = Array.from({ length: 241 }, (_, i) => ((i + 10) / 10).toFixed(1));

export default function FreeWorkout({ user, onLogSaved, activeTopTab = "freeworkout" }: FreeWorkoutProps) {
  // Navigation inside Free Workout component
  const [activeSubTab, setActiveSubTab] = useState<"workout" | "machines" | "calendar" | "plan">("workout");

  useEffect(() => {
    if (activeTopTab === "calendar") {
      setActiveSubTab("calendar");
    } else if (activeTopTab === "plan") {
      setActiveSubTab("plan");
    } else if (activeTopTab === "freeworkout") {
      // If we go to freeworkout, and we were on calendar or plan, reset to workout
      if (activeSubTab === "calendar" || activeSubTab === "plan") {
        setActiveSubTab("workout");
      }
    }
  }, [activeTopTab]);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  // State for Catalog of Machines
  const [machines, setMachines] = useState<MachineExercise[]>(() => {
    try {
      const cached = safeGetItem("cached_machines");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MACHINES;
  });

  // Category filter and Search query for machines catalog
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal to Add New Machine
  const [showAddMachineModal, setShowAddMachineModal] = useState<boolean>(false);
  const [newMachineName, setNewMachineName] = useState<string>("");
  const [newMachineCategory, setNewMachineCategory] = useState<string[]>(["Cardio"]);
  const [newMachineDesc, setNewMachineDesc] = useState<string>("");
  const [newMachineGallery, setNewMachineGallery] = useState<string[]>([]);
  const [zoomedGallery, setZoomedGallery] = useState<{urls: string[], index: number, title?: string} | null>(null);
  const [newMachineLinks, setNewMachineLinks] = useState<string[]>([]);
  const [newLinkInput, setNewLinkInput] = useState<string>("");
  const [newImageInput, setNewImageInput] = useState<string>("");

  // Modal to Edit Machine (Name, Description, Category, Photo)
  const [editingMachine, setEditingMachine] = useState<MachineExercise | null>(null);
  const [editMachineName, setEditMachineName] = useState<string>("");
  const [editMachineCategory, setEditMachineCategory] = useState<string[]>(["Cardio"]);
  const [editMachineDesc, setEditMachineDesc] = useState<string>("");
  const [editMachineGallery, setEditMachineGallery] = useState<string[]>([]);
  const [editMachineLinks, setEditMachineLinks] = useState<string[]>([]);
  const [editLinkInput, setEditLinkInput] = useState<string>("");
  const [editImageInput, setEditImageInput] = useState<string>("");

  // State for Exercise History (Last weights & reps or cardio time & intensity per machineId)
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseLastPerformance>>({});

  // State for Completed Free Workout Logs (with cached initial state)
  const [workoutLogs, setWorkoutLogs] = useState<FreeWorkoutLog[]>(() => {
    try {
      const cached = safeGetItem("cached_free_workout_logs");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [savedPlans, setSavedPlans] = useState<import("../types").SavedWorkoutPlan[]>(() => {
    try {
      const cached = safeGetItem("cached_saved_workout_plans");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanMachines, setNewPlanMachines] = useState<MachineExercise[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Fetch Firestore Data
  useEffect(() => {
    if (!user) return;

    // Listen to machines
    const machinesQuery = query(collection(db, "machines"));
    let hasSeeded = false;
    const unsubscribeMachines = onSnapshot(machinesQuery, (snapshot) => {
      const fetchedMachines: MachineExercise[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isCardio = Boolean(
          data.isCardio || 
          isCardioCategory(data.category)
        );
        fetchedMachines.push({
          id: docSnap.id,
          name: data.name,
          category: data.category,
          description: data.description,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || [],
          links: data.links || [],
          isCustom: data.isCustom,
          isCardio: isCardio,
        });
      });
      
      // Auto-seed initial machines if empty (only first time overall)
      if (fetchedMachines.length === 0 && !hasSeeded) {
        hasSeeded = true;
        const seedMachines = async () => {
          try {
            const batch = writeBatch(db);
            INITIAL_MACHINES.forEach(m => {
              const docRef = doc(db, "machines", m.id);
              batch.set(docRef, {
                name: m.name,
                category: m.category,
                description: m.description,
                imageUrl: m.imageUrl,
                isCustom: false,
                isCardio: Boolean(m.isCardio),
                createdAt: Date.now(),
                createdBy: user.uid
              });
            });
            await batch.commit();
          } catch (e) {
            console.error("Error seeding machines:", e);
          }
        };
        seedMachines();
      } else if (fetchedMachines.length > 0) {
        hasSeeded = true;
        setMachines(fetchedMachines);
        safeSetItem("cached_machines", JSON.stringify(fetchedMachines));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "machines");
    });

    // Listen to workoutLogs for the user
    const logsQuery = query(collection(db, "workoutLogs"), where("userId", "==", user.uid));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const fetchedLogs: FreeWorkoutLog[] = [];
      const newHistory: Record<string, ExerciseLastPerformance> = {};

      snapshot.forEach(docSnap => {
        const data = docSnap.data();

        // Extract exercises array robustly
        let parsedExercises: FreeWorkoutLog["exercises"] = [];
        if (Array.isArray(data.exercises) && data.exercises.length > 0) {
          parsedExercises = data.exercises.map((ex: any) => ({
            machineId: ex.machineId || ex.id || "ex",
            name: ex.name || "Ejercicio",
            imageUrl: ex.imageUrl || "",
            imageUrls: ex.imageUrls || [],
            links: ex.links || [],
            category: ex.category || (ex.isCardio ? ["Cardio"] : ["Fuerza"]),
            isCardio: Boolean(ex.isCardio || isCardioCategory(ex.category)),
            sets: Array.isArray(ex.sets) ? ex.sets.map((s: any) => ({
              setNumber: s.setNumber || 1,
              reps: Number(s.reps) || 0,
              weight: Number(s.weight) || 0,
              completed: Boolean(s.completed),
              rir: s.rir
            })) : [],
            cardio: Array.isArray(ex.cardio) ? ex.cardio.map((c: any) => ({
              blockNumber: c.blockNumber || 1,
              durationMinutes: Number(c.durationMinutes) || 0,
              intensity: c.intensity || "Moderada",
              distanceKm: Number(c.distanceKm) || 0,
              caloriesKcal: Number(c.caloriesKcal) || 0,
              speedKmh: c.speedKmh !== undefined ? Number(c.speedKmh) : undefined,
              inclinePct: c.inclinePct !== undefined ? Number(c.inclinePct) : undefined,
              completed: Boolean(c.completed)
            })) : []
          }));
        } else if (data.exerciseName || (Array.isArray(data.sets) && data.sets.length > 0)) {
          // Backward compatibility for routine logs
          parsedExercises = [{
            machineId: data.exerciseId || docSnap.id,
            name: data.exerciseName || "Ejercicio",
            imageUrl: "",
            category: "Fuerza",
            isCardio: false,
            sets: Array.isArray(data.sets) ? data.sets.map((s: any) => ({
              setNumber: s.setNumber || 1,
              reps: Number(s.reps) || 0,
              weight: Number(s.weight) || 0,
              completed: Boolean(s.completed),
              rir: s.rir
            })) : [],
            cardio: []
          }];
        }

        const rawDate = data.date || (data.createdAt ? new Date(data.createdAt).toISOString().split("T")[0] : getTodayFormattedString());
        const normalizedDate = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

        const freeLog: FreeWorkoutLog = {
          id: docSnap.id,
          date: normalizedDate,
          startTime: data.startTime || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
          endTime: data.endTime || (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
          durationSeconds: typeof data.durationSeconds === "number" && data.durationSeconds > 0 ? data.durationSeconds : (data.duration ? Number(data.duration) : 60),
          exercises: parsedExercises,
          notes: data.notes || ""
        };
        fetchedLogs.push(freeLog);

        // Compute history
        if (Array.isArray(freeLog.exercises)) {
          freeLog.exercises.forEach(ex => {
            const isExCardio = Boolean(
              ex.isCardio || 
              isCardioCategory(ex.category) || 
              (ex.cardio && ex.cardio.length > 0)
            );
            const maxWeight = Math.max(...(ex.sets || []).map(s => s.weight || 0), 0);
            const totalMinutes = (ex.cardio || []).reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
            const lastIntensity = (ex.cardio && ex.cardio[0]?.intensity) || "";

            const currentRecord = newHistory[ex.machineId];
            if (!currentRecord || new Date(freeLog.date).getTime() >= new Date(currentRecord.date).getTime()) {
              newHistory[ex.machineId] = {
                machineId: ex.machineId,
                date: freeLog.date,
                isCardio: isExCardio,
                sets: ex.sets || [],
                cardio: ex.cardio || [],
                maxWeight: maxWeight,
                totalCardioMinutes: totalMinutes,
                lastIntensity: lastIntensity,
                notes: ex.notes
              };
            }
          });
        }
      });
      
      const sorted = fetchedLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWorkoutLogs(sorted);
      setExerciseHistory(newHistory);
      safeSetItem("cached_free_workout_logs", JSON.stringify(sorted));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "workoutLogs");
    });

    return () => {
      unsubscribeMachines();
      unsubscribeLogs();
    };
  }, [user]);

  // Helper to compute exact real-time elapsed seconds from timestamps and accumulated paused duration
  const calculateLiveElapsed = (
    active: boolean,
    started: boolean,
    paused: boolean,
    accum: number,
    resumeTs: number | null,
    startTs: number | null,
    startIso: string | null
  ): number => {
    if (!active || !started) return 0;
    if (paused) return Math.max(0, accum);
    const now = Date.now();
    if (resumeTs) {
      const additional = Math.max(0, Math.floor((now - resumeTs) / 1000));
      return Math.max(0, accum + additional);
    }
    if (startTs) {
      return Math.max(0, Math.floor((now - startTs) / 1000));
    }
    if (startIso) {
      const parsed = new Date(startIso).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(0, Math.floor((now - parsed) / 1000));
      }
    }
    return Math.max(0, accum);
  };

  // Active Free Workout Session state (with background restore based on real clock timestamps)
  const getSavedActiveSession = () => {
    try {
      const saved = safeGetItem("active_free_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const savedSession = getSavedActiveSession();

  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => Boolean(savedSession?.isSessionActive));
  const [isTimerStarted, setIsTimerStarted] = useState<boolean>(() => Boolean(savedSession?.isTimerStarted));
  const [isPaused, setIsPaused] = useState<boolean>(() => Boolean(savedSession?.isPaused));
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(() => savedSession?.sessionStartTime || null);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<number | null>(() => {
    if (savedSession?.sessionStartTimestamp) return savedSession.sessionStartTimestamp;
    if (savedSession?.sessionStartTime) {
      const parsed = new Date(savedSession.sessionStartTime).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  });
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(() => {
    if (!savedSession) return 0;
    return Number(savedSession.accumulatedSeconds) || 0;
  });
  const [lastResumeTimestamp, setLastResumeTimestamp] = useState<number | null>(() => {
    if (!savedSession) return null;
    if (savedSession.isPaused) return null;
    if (savedSession.lastResumeTimestamp) return savedSession.lastResumeTimestamp;
    if (savedSession.sessionStartTimestamp) return savedSession.sessionStartTimestamp;
    if (savedSession.sessionStartTime) {
      const parsed = new Date(savedSession.sessionStartTime).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null;
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (!savedSession) return 0;
    return calculateLiveElapsed(
      Boolean(savedSession.isSessionActive),
      Boolean(savedSession.isTimerStarted),
      Boolean(savedSession.isPaused),
      Number(savedSession.accumulatedSeconds) || 0,
      savedSession.lastResumeTimestamp || null,
      savedSession.sessionStartTimestamp || null,
      savedSession.sessionStartTime || null
    );
  });
  const [activeExercises, setActiveExercises] = useState<ActiveFreeExercise[]>(() => savedSession?.activeExercises || []);
  const [sessionNotes, setSessionNotes] = useState<string>(() => savedSession?.sessionNotes || "");
  const [resumingLogId, setResumingLogId] = useState<string | null>(() => savedSession?.resumingLogId || null);

  // Real-time active session auto-persistence to localStorage
  useEffect(() => {
    if (isSessionActive) {
      const stateToSave = {
        isSessionActive,
        isTimerStarted,
        sessionStartTime,
        sessionStartTimestamp,
        lastResumeTimestamp,
        accumulatedSeconds,
        elapsedSeconds,
        lastSavedTime: Date.now(),
        isPaused,
        activeExercises,
        sessionNotes,
        resumingLogId,
        userId: user?.uid
      };
      safeSetItem("active_free_session", JSON.stringify(stateToSave));
    } else {
      safeRemoveItem("active_free_session");
    }
  }, [
    isSessionActive,
    isTimerStarted,
    sessionStartTime,
    sessionStartTimestamp,
    lastResumeTimestamp,
    accumulatedSeconds,
    elapsedSeconds,
    isPaused,
    activeExercises,
    sessionNotes,
    resumingLogId,
    user
  ]);

  // Modal to select machines to add to current session
  const [showSelectMachineModal, setShowSelectMachineModal] = useState<boolean>(false);
  const [showPlanMachineSelector, setShowPlanMachineSelector] = useState<boolean>(false);

  // Modal to configure cardio before adding
  const [pendingCardioMachine, setPendingCardioMachine] = useState<{
    machine: MachineExercise;
    durationMinutes: number | string;
    intensity: string;
  } | null>(null);

  // Completed Session Celebration Modal
  const [completedSummary, setCompletedSummary] = useState<FreeWorkoutLog | null>(null);

  // Helper function to get YYYY-MM-DD string in local time
  const getTodayFormattedString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calendar view month, year, and selected date state
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayFormattedString());

  // Interactive expanded exercise state in calendar list
  const [expandedCalendarExerciseId, setExpandedCalendarExerciseId] = useState<string | null>(null);

  // Dedicated full details modal for an exercise from history/calendar
  const [selectedExerciseDetailModal, setSelectedExerciseDetailModal] = useState<{
    log: FreeWorkoutLog;
    exercise: {
      machineId: string;
      name: string;
      imageUrl?: string;
      imageUrls?: string[];
      links?: string[];
      category?: string | string[];
      isCardio?: boolean;
      sets?: FreeExerciseSet[];
      cardio?: CardioBlock[];
    };
    activeImageIndex?: number;
  } | null>(null);

  // Rest Timer Modal Trigger
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number>(90);
  const [restTimerType, setRestTimerType] = useState<"set" | "exercise">("set");
  const [restTimerKey, setRestTimerKey] = useState<number>(0);
  
  const [defaultSetRest, setDefaultSetRest] = useState<number>(() => {
    const saved = safeGetItem("default_set_rest");
    return saved ? parseInt(saved, 10) : 90;
  });
  
  const [defaultCardioRest, setDefaultCardioRest] = useState<number>(() => {
    const saved = safeGetItem("default_cardio_rest");
    return saved ? parseInt(saved, 10) : 60;
  });

  const handleTimeAdjusted = (newTotal: number) => {
    if (restTimerType === "set") {
      setDefaultSetRest(newTotal);
      safeSetItem("default_set_rest", newTotal.toString());
    } else {
      setDefaultCardioRest(newTotal);
      safeSetItem("default_cardio_rest", newTotal.toString());
    }
  };

  // Live Timer Interval + Visibility / Focus synchronization based on Date.now() wall clock
  useEffect(() => {
    const syncTimer = () => {
      if (isSessionActive && isTimerStarted) {
        setElapsedSeconds(
          calculateLiveElapsed(
            isSessionActive,
            isTimerStarted,
            isPaused,
            accumulatedSeconds,
            lastResumeTimestamp,
            sessionStartTimestamp,
            sessionStartTime
          )
        );
      }
    };

    // Run immediately
    syncTimer();

    let interval: any = null;
    if (isSessionActive && isTimerStarted && !isPaused) {
      interval = setInterval(syncTimer, 500);
    }

    const handleSyncEvent = () => {
      syncTimer();
    };

    const handleSaveOnExit = () => {
      if (isSessionActive) {
        const liveNow = calculateLiveElapsed(
          isSessionActive,
          isTimerStarted,
          isPaused,
          accumulatedSeconds,
          lastResumeTimestamp,
          sessionStartTimestamp,
          sessionStartTime
        );
        safeSetItem("active_free_session", JSON.stringify({
          isSessionActive,
          isTimerStarted,
          sessionStartTime,
          sessionStartTimestamp,
          lastResumeTimestamp,
          accumulatedSeconds,
          elapsedSeconds: liveNow,
          lastSavedTime: Date.now(),
          isPaused,
          activeExercises,
          sessionNotes,
          userId: user?.uid
        }));
      }
    };

    document.addEventListener("visibilitychange", handleSyncEvent);
    window.addEventListener("focus", handleSyncEvent);
    window.addEventListener("pageshow", handleSyncEvent);
    window.addEventListener("beforeunload", handleSaveOnExit);
    window.addEventListener("pagehide", handleSaveOnExit);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleSyncEvent);
      window.removeEventListener("focus", handleSyncEvent);
      window.removeEventListener("pageshow", handleSyncEvent);
      window.removeEventListener("beforeunload", handleSaveOnExit);
      window.removeEventListener("pagehide", handleSaveOnExit);
    };
  }, [isSessionActive, isTimerStarted, isPaused, accumulatedSeconds, lastResumeTimestamp, sessionStartTimestamp, sessionStartTime]);

  // Helper to read and compress images from user photo gallery
  const compressAndReadImage = (file: File, callback: (base64: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 480;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.70);
          callback(resizedDataUrl);
        } else {
          callback(e.target?.result as string);
        }
      };
      img.onerror = () => {
        callback(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Update photo for any machine in catalog
  const handleUpdateMachinePhoto = async (machineId: string, photoDataUrl: string) => {
    try {
      const existingMachine = machines.find(m => m.id === machineId);
      let updatedImageUrls = existingMachine?.imageUrls ? [...existingMachine.imageUrls] : [];
      if (updatedImageUrls.length > 0) {
        updatedImageUrls[0] = photoDataUrl;
      } else {
        updatedImageUrls = [photoDataUrl];
      }

      await setDoc(doc(db, "machines", machineId), { 
        imageUrl: photoDataUrl,
        imageUrls: updatedImageUrls 
      }, { merge: true });
      
      // Update active exercises if present
      setActiveExercises(prev => prev.map(e => e.machineId === machineId ? { ...e, imageUrl: photoDataUrl, imageUrls: updatedImageUrls } : e));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `machines/${machineId}`);
    }
  };

  // Persist machines when updated
  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName.trim()) return;

    // Use the first image in gallery as the main thumbnail, fallback to empty
    const mainImageUrl = newMachineGallery.length > 0 ? newMachineGallery[0] : "";

    const machineId = "machine_" + Date.now();
    const newMachine = {
      name: newMachineName.trim(),
      category: newMachineCategory,
      description: newMachineDesc.trim() || "Máquina / Ejercicio personalizado de gimnasio.",
      imageUrl: mainImageUrl,
      imageUrls: newMachineGallery,
      links: newMachineLinks,
      isCustom: true,
      createdAt: Date.now(),
      createdBy: user.uid
    };

    // Optimistically add to machines state & local storage
    setMachines(prev => {
      const updated = [{ ...newMachine, id: machineId }, ...prev];
      safeSetItem("cached_machines", JSON.stringify(updated));
      return updated;
    });

    // Reset modal form
    setNewMachineName("");
    setNewMachineDesc("");
    setNewMachineCategory(["Cardio"]);
    setNewMachineGallery([]);
    setNewMachineLinks([]);
    setNewLinkInput("");
    setNewImageInput("");
    setShowAddMachineModal(false);

    // If session is active, automatically add it to session
    if (isSessionActive) {
      addMachineToActiveSession({ ...newMachine, id: machineId });
    }

    try {
      await setDoc(doc(db, "machines", machineId), cleanForFirestore(newMachine));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `machines/${machineId}`);
    }
  };

  // Open Edit Machine Modal
  const handleOpenEditMachine = (machine: MachineExercise) => {
    setEditingMachine(machine);
    setEditMachineName(machine.name);
    
    // Normalize category to array
    const catArray = Array.isArray(machine.category) 
      ? machine.category 
      : (machine.category ? [machine.category] : ["Cardio"]);
    setEditMachineCategory(catArray);
    
    setEditMachineDesc(machine.description);
    
    // Set gallery (if none exists, use the single imageUrl if present)
    const gallery = machine.imageUrls ? [...machine.imageUrls] : (machine.imageUrl ? [machine.imageUrl] : []);
    setEditMachineGallery(gallery);
    setEditMachineLinks(machine.links ? [...machine.links] : []);
    setEditLinkInput("");
    setEditImageInput("");
  };

  // Save changes to edited machine
  const handleSaveEditedMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine || !editMachineName.trim()) return;

    const mainImageUrl = editMachineGallery.length > 0 ? editMachineGallery[0] : "";

    // Optimistically update machines state
    setMachines(prev => {
      const updated = prev.map(m => m.id === editingMachine.id ? {
        ...m,
        name: editMachineName.trim(),
        category: editMachineCategory,
        description: editMachineDesc.trim(),
        imageUrl: mainImageUrl,
        imageUrls: editMachineGallery,
        links: editMachineLinks
      } : m);
      safeSetItem("cached_machines", JSON.stringify(updated));
      return updated;
    });

    // Update active exercise if present in active workout session
    setActiveExercises(prev => prev.map(ex => ex.machineId === editingMachine.id ? {
      ...ex,
      name: editMachineName.trim(),
      category: editMachineCategory,
      description: editMachineDesc.trim(),
      imageUrl: mainImageUrl
    } : ex));

    const machineIdToEdit = editingMachine.id;
    setEditingMachine(null);

    try {
      await setDoc(doc(db, "machines", machineIdToEdit), cleanForFirestore({
        name: editMachineName.trim(),
        category: editMachineCategory,
        description: editMachineDesc.trim(),
        imageUrl: mainImageUrl,
        imageUrls: editMachineGallery,
        links: editMachineLinks
      }), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `machines/${machineIdToEdit}`);
    }
  };

  const handleDeleteMachine = (id: string) => {
    const target = machines.find(m => m.id === id);
    const machineName = target ? target.name : "esta máquina";

    setConfirmDialog({
      message: `¿Deseas eliminar "${machineName}" del catálogo de máquinas?`,
      action: async () => {
        try {
          await deleteDoc(doc(db, "machines", id));
          // Remove from active session exercises if present
          setActiveExercises(prev => prev.filter(e => e.machineId !== id));

          if (editingMachine && editingMachine.id === id) {
            setEditingMachine(null);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `machines/${id}`);
        }
      }
    });
  };

  const handleResetDefaultMachines = () => {
    setConfirmDialog({
      message: "¿Deseas restablecer las máquinas predeterminadas del gimnasio? Volverán a aparecer las máquinas originales.",
      action: async () => {
        try {
          const batch = writeBatch(db);
          
          // Optionally delete all existing machines
          const querySnapshot = await getDocs(collection(db, "machines"));
          querySnapshot.forEach(docSnap => {
             batch.delete(docSnap.ref);
          });

          // Add back initial
          INITIAL_MACHINES.forEach(m => {
            const docRef = doc(db, "machines", m.id);
            batch.set(docRef, {
              name: m.name,
              category: m.category,
              description: m.description,
              imageUrl: m.imageUrl,
              isCustom: false,
              createdAt: Date.now(),
              createdBy: user.uid
            });
          });

          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "machines");
        }
      }
    });
  };

  // Pause / Resume handler preserving exact elapsed wall-clock seconds
  const handleTogglePause = () => {
    const now = Date.now();
    if (!isPaused) {
      // Pausing: calculate live additional seconds since last resume
      const additional = lastResumeTimestamp ? Math.max(0, Math.floor((now - lastResumeTimestamp) / 1000)) : 0;
      const newAccum = accumulatedSeconds + additional;
      setAccumulatedSeconds(newAccum);
      setElapsedSeconds(newAccum);
      setLastResumeTimestamp(null);
      setIsPaused(true);
    } else {
      // Resuming: set fresh resume timestamp
      setLastResumeTimestamp(now);
      setIsPaused(false);
    }
  };

  const getTodayExistingLog = () => {
    const todayStr = getTodayFormattedString();
    return workoutLogs.find(l => normalizeDateKey(l.date) === todayStr);
  };

  // Start new free workout session and start timer
  const handleStartSession = () => {
    const todayLog = getTodayExistingLog();
    if (todayLog) {
      handleResumeSession(todayLog);
      return;
    }

    const now = Date.now();
    setIsSessionActive(true);
    setIsTimerStarted(true);
    setSessionStartTime(new Date(now).toISOString());
    setSessionStartTimestamp(now);
    setLastResumeTimestamp(now);
    setAccumulatedSeconds(0);
    setElapsedSeconds(0);
    setIsPaused(false);
    setResumingLogId(null);
    if (activeExercises.length === 0) {
      setShowSelectMachineModal(true); // Prompt user to add first machine
    }
  };

  // Start timer explicitly when user clicks "Empezar Entrenamiento"
  const handleStartTimer = () => {
    const now = Date.now();
    setIsSessionActive(true);
    setIsTimerStarted(true);
    if (!sessionStartTime) {
      setSessionStartTime(new Date(now).toISOString());
    }
    if (!sessionStartTimestamp) {
      setSessionStartTimestamp(now);
    }
    setLastResumeTimestamp(now);
    setIsPaused(false);
  };

  // Add a machine to active session WITHOUT starting the timer automatically
  const addMachineToActiveSession = (machine: MachineExercise) => {
    setIsSessionActive(true);
    // Note: isTimerStarted is NOT set to true here, timer won't start automatically!

    // Check if already in session
    const existing = activeExercises.find(e => e.machineId === machine.id);
    if (existing) {
      alert(`El ejercicio "${machine.name}" ya está añadido en la sesión activa.`);
      return;
    }

    const isCardio = Boolean(
      machine.isCardio || 
      isCardioCategory(machine.category)
    );

    // Retrieve last performance if available
    const lastPerf = exerciseHistory[machine.id];

    if (isCardio) {
      let defMins = 15;
      let defInt = "5.0";
      if (lastPerf && lastPerf.cardio && lastPerf.cardio.length > 0) {
        defMins = lastPerf.cardio[0].durationMinutes || 15;
        defInt = lastPerf.cardio[0].intensity || "5.0";
      }
      setPendingCardioMachine({
        machine,
        durationMinutes: defMins,
        intensity: defInt
      });
      setShowSelectMachineModal(false);
      return;
    }

    let initialSets: FreeExerciseSet[] = [];
    initialSets = [
      { setNumber: 1, reps: 10, weight: 20, completed: false },
      { setNumber: 2, reps: 10, weight: 20, completed: false },
      { setNumber: 3, reps: 10, weight: 20, completed: false }
    ];

    if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
      initialSets = lastPerf.sets.map(s => ({
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        completed: false
      }));
    }

    const newActiveExercise: ActiveFreeExercise = {
      machineId: machine.id,
      name: machine.name,
      description: machine.description,
      imageUrl: machine.imageUrl,
      imageUrls: machine.imageUrls || [],
      links: machine.links || [],
      category: machine.category,
      isCardio: false,
      sets: initialSets,
      cardio: []
    };

    setActiveExercises(prev => [...prev, newActiveExercise]);
    setShowSelectMachineModal(false);
  };

  const confirmAddCardioMachine = () => {
    if (!pendingCardioMachine) return;
    
    const { machine, durationMinutes, intensity } = pendingCardioMachine;
    const durNum = Math.max(1, parseInt(durationMinutes as string) || 15);
    const lastPerf = exerciseHistory[machine.id];
    let initialCardio: CardioBlock[] = [];

    initialCardio = [
      {
        blockNumber: 1,
        durationMinutes: durNum,
        intensity: intensity || "5.0",
        distanceKm: lastPerf?.cardio?.[0]?.distanceKm || 0,
        caloriesKcal: lastPerf?.cardio?.[0]?.caloriesKcal || 0,
        speedKmh: lastPerf?.cardio?.[0]?.speedKmh,
        inclinePct: lastPerf?.cardio?.[0]?.inclinePct,
        completed: false
      }
    ];

    const newActiveExercise: ActiveFreeExercise = {
      machineId: machine.id,
      name: machine.name,
      description: machine.description,
      imageUrl: machine.imageUrl,
      imageUrls: machine.imageUrls || [],
      links: machine.links || [],
      category: machine.category,
      isCardio: true,
      sets: [],
      cardio: initialCardio
    };

    setActiveExercises(prev => [...prev, newActiveExercise]);
    setPendingCardioMachine(null);
  };

  // Copy last performance sets/cardio to current active exercise
  const handleCopyLastPerformance = (machineId: string) => {
    const lastPerf = exerciseHistory[machineId];
    if (!lastPerf) return;

    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        if (lastPerf.isCardio && lastPerf.cardio && lastPerf.cardio.length > 0) {
          return {
            ...ex,
            cardio: lastPerf.cardio.map((c, i) => ({
              ...c,
              blockNumber: i + 1,
              completed: false
            }))
          };
        } else if (lastPerf.sets && lastPerf.sets.length > 0) {
          return {
            ...ex,
            sets: lastPerf.sets.map(s => ({
              setNumber: s.setNumber,
              reps: s.reps,
              weight: s.weight,
              completed: false
            }))
          };
        }
      }
      return ex;
    }));
  };

  // Set management for strength active exercises
  const handleUpdateSet = (machineId: string, setIndex: number, field: "reps" | "weight" | "rir", value: any) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const updatedSets = ex.sets.map((s, idx) => {
          if (idx === setIndex) {
            if (field === "rir") {
              const getRirNum = (rirStr: string | undefined | null) => {
                if (!rirStr) return 0;
                const match = rirStr.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              
              const oldRir = getRirNum(s.rir as string);
              const newRir = getRirNum(value as string);
              const rirDiff = newRir - oldRir;
              
              return { 
                ...s, 
                rir: value, 
                reps: Math.max(0, (s.reps || 0) + rirDiff) 
              };
            }
            return { ...s, [field]: Math.max(0, value) };
          }
          if (field === "weight" && idx > setIndex && !s.completed) {
            return { ...s, weight: Math.max(0, value) };
          }
          return s;
        });
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleToggleSetComplete = (machineId: string, setIndex: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const updatedSets = ex.sets.map((s, idx) => {
          if (idx === setIndex) {
            const nextCompleted = !s.completed;
            if (nextCompleted) {
              // Open optional rest timer
              setRestTimerType("set");
              setRestTimerSeconds(defaultSetRest);
              setRestTimerKey(prev => prev + 1);
              setShowRestTimer(true);
            }
            return { ...s, completed: nextCompleted };
          }
          return s;
        });
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleAddSetToExercise = (machineId: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: FreeExerciseSet = {
          setNumber: ex.sets.length + 1,
          reps: lastSet ? lastSet.reps : 10,
          weight: lastSet ? lastSet.weight : 20,
          completed: false
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const handleRemoveSetFromExercise = (machineId: string, setIndex: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const filtered = ex.sets.filter((_, idx) => idx !== setIndex);
        const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: renumbered };
      }
      return ex;
    }));
  };

  const handleUpdateExerciseNotes = (machineId: string, notes: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        return { ...ex, notes };
      }
      return ex;
    }));
  };

  // Cardio block management for cardio machines
  const handleUpdateCardio = (
    machineId: string, 
    blockIndex: number, 
    field: keyof CardioBlock, 
    value: any
  ) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const updatedCardio = (ex.cardio || []).map((c, idx) => {
          if (idx === blockIndex) {
            return { ...c, [field]: value };
          }
          return c;
        });
        return { ...ex, cardio: updatedCardio };
      }
      return ex;
    }));
  };

  const handleToggleCardioComplete = (machineId: string, blockIndex: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const updatedCardio = (ex.cardio || []).map((c, idx) => {
          if (idx === blockIndex) {
            const nextCompleted = !c.completed;
            if (nextCompleted) {
              setRestTimerType("exercise");
              setRestTimerSeconds(defaultCardioRest);
              setRestTimerKey(prev => prev + 1);
              setShowRestTimer(true);
            }
            return { ...c, completed: nextCompleted };
          }
          return c;
        });
        return { ...ex, cardio: updatedCardio };
      }
      return ex;
    }));
  };

  const handleAddCardioBlock = (machineId: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const lastBlock = ex.cardio?.[ex.cardio.length - 1];
        const newBlock: CardioBlock = {
          blockNumber: (ex.cardio?.length || 0) + 1,
          durationMinutes: lastBlock ? lastBlock.durationMinutes : 15,
          intensity: lastBlock ? lastBlock.intensity : "5.0",
          distanceKm: 0,
          caloriesKcal: 0,
          completed: false
        };
        return { ...ex, cardio: [...(ex.cardio || []), newBlock] };
      }
      return ex;
    }));
  };

  const handleRemoveCardioBlock = (machineId: string, blockIndex: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.machineId === machineId) {
        const filtered = (ex.cardio || []).filter((_, idx) => idx !== blockIndex);
        const renumbered = filtered.map((c, idx) => ({ ...c, blockNumber: idx + 1 }));
        return { ...ex, cardio: renumbered };
      }
      return ex;
    }));
  };

  const handleRemoveExerciseFromSession = (machineId: string) => {
    setActiveExercises(prev => prev.filter(e => e.machineId !== machineId));
  };

  const handleMoveActiveExercise = (index: number, direction: "up" | "down") => {
    setActiveExercises(prev => {
      const newExercises = [...prev];
      if (direction === "up" && index > 0) {
        [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      } else if (direction === "down" && index < newExercises.length - 1) {
        [newExercises[index + 1], newExercises[index]] = [newExercises[index], newExercises[index + 1]];
      }
      return newExercises;
    });
  };

  // Finish active session & save (prompts confirmation)
  const handleFinishSession = () => {
    if (activeExercises.length === 0) {
      alert("Añade al menos un ejercicio antes de finalizar la sesión.");
      return;
    }
    setConfirmDialog({
      message: "¿Estás seguro de que deseas finalizar la sesión de entrenamiento?",
      action: () => {
        executeFinishSession();
      }
    });
  };

  // Execute Finish active session & save
  const executeFinishSession = async () => {
    if (activeExercises.length === 0) {
      alert("Añade al menos un ejercicio antes de finalizar la sesión.");
      return;
    }

    const now = new Date();
    const dateStr = getTodayFormattedString();
    const logId = resumingLogId || ("free_log_" + Date.now());
    const exactDuration = calculateLiveElapsed(
      isSessionActive,
      isTimerStarted,
      isPaused,
      accumulatedSeconds,
      lastResumeTimestamp,
      sessionStartTimestamp,
      sessionStartTime
    );
    const finalDuration = Math.max(1, exactDuration || elapsedSeconds);

    const sanitizeUrlForLog = (url?: string): string => {
      if (!url || typeof url !== "string") return "";
      // Do not store large base64 data URIs inside workout log documents
      if (url.startsWith("data:")) return "";
      return url;
    };

    const finishedLog: FreeWorkoutLog = {
      id: logId,
      date: dateStr,
      startTime: sessionStartTime || now.toISOString(),
      endTime: now.toISOString(),
      durationSeconds: finalDuration,
      exercises: activeExercises.map(ex => ({
        machineId: ex.machineId,
        name: ex.name,
        imageUrl: sanitizeUrlForLog(ex.imageUrl),
        imageUrls: (ex.imageUrls || []).map(sanitizeUrlForLog).filter(Boolean),
        links: (ex.links || []).filter(Boolean),
        category: ex.category || (ex.isCardio ? ["Cardio"] : ["Fuerza"]),
        isCardio: Boolean(ex.isCardio),
        notes: ex.notes || "",
        sets: (ex.sets || []).map(s => ({
          setNumber: s.setNumber,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
          ...(s.rir ? { rir: String(s.rir) } : {}),
          completed: Boolean(s.completed)
        })),
        cardio: (ex.cardio || []).map(c => ({
          blockNumber: c.blockNumber,
          durationMinutes: Number(c.durationMinutes) || 0,
          intensity: c.intensity || "Moderada",
          distanceKm: Number(c.distanceKm) || 0,
          caloriesKcal: Number(c.caloriesKcal) || 0,
          ...(c.speedKmh !== undefined && !isNaN(Number(c.speedKmh)) ? { speedKmh: Number(c.speedKmh) } : {}),
          ...(c.inclinePct !== undefined && !isNaN(Number(c.inclinePct)) ? { inclinePct: Number(c.inclinePct) } : {}),
          completed: Boolean(c.completed)
        }))
      })),
      notes: sessionNotes.trim()
    };

    // 1. Optimistically update local workoutLogs state so the calendar shows it immediately
    setWorkoutLogs(prev => {
      const updated = [finishedLog, ...prev.filter(l => l.id !== logId)];
      safeSetItem("cached_free_workout_logs", JSON.stringify(updated));
      return updated;
    });

    // 2. Select the finished date in calendar & ensure current month view
    setSelectedCalendarDate(dateStr);
    setCalendarDate(new Date());

    // 3. Notify parent (App.tsx)
    if (onLogSaved) {
      onLogSaved(finishedLog);
    }

    // 4. Show celebration modal
    setCompletedSummary(finishedLog);

    // 5. Reset active session state
    setIsSessionActive(false);
    setIsTimerStarted(false);
    setSessionStartTime(null);
    setSessionStartTimestamp(null);
    setLastResumeTimestamp(null);
    setAccumulatedSeconds(0);
    setElapsedSeconds(0);
    setIsPaused(false);
    setActiveExercises([]);
    setSessionNotes("");
    setResumingLogId(null);
    safeRemoveItem("active_free_session");

    // 6. Persist to Firestore
    try {
      await setDoc(doc(db, "workoutLogs", logId), cleanForFirestore({
        ...finishedLog,
        userId: user.uid,
        createdAt: Date.now()
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `workoutLogs/${logId}`);
    }
  };

  // Resume a finished session from today, or repeat a past session today
  const handleResumeSession = (log: FreeWorkoutLog) => {
    const isToday = normalizeDateKey(log.date) === getTodayFormattedString();
    
    let targetLogId = isToday ? log.id : null;
    let baseExercises: ActiveFreeExercise[] = [];
    let baseNotes = "";
    let baseDuration = 0;
    let baseStartTime = log.startTime || new Date().toISOString();

    if (!isToday) {
      // Repeating a past session. Check if we already have a session today to merge into.
      const todayLog = getTodayExistingLog();
      if (todayLog) {
        targetLogId = todayLog.id;
        baseNotes = todayLog.notes || "";
        baseDuration = todayLog.durationSeconds || 0;
        baseStartTime = todayLog.startTime || baseStartTime;
        
        // Load today's existing exercises first
        baseExercises = todayLog.exercises.map(ex => {
          const isCardio = Boolean(ex.isCardio || isCardioCategory(ex.category) || (ex.cardio && ex.cardio.length > 0));
          const machineObj = machines.find(m => m.id === ex.machineId);
          return {
            machineId: ex.machineId,
            name: ex.name,
            description: machineObj?.description || "",
            imageUrl: ex.imageUrl || machineObj?.imageUrl || PRESET_MACHINE_PHOTOS[0],
            imageUrls: (ex.imageUrls && ex.imageUrls.length > 0) ? ex.imageUrls : (machineObj?.imageUrls || []),
            links: (ex.links && ex.links.length > 0) ? ex.links : (machineObj?.links || []),
            category: ex.category || (isCardio ? "Cardio" : "Fuerza"),
            isCardio: isCardio,
            sets: (ex.sets || []).map(s => ({ ...s })),
            cardio: (ex.cardio || []).map(c => ({ ...c }))
          };
        });
      }
    } else {
      // Normal resume of today's session
      baseNotes = log.notes || "";
      baseDuration = log.durationSeconds || 0;
      baseStartTime = log.startTime || baseStartTime;
    }

    const restoredExercises: ActiveFreeExercise[] = log.exercises.map(ex => {
      const isCardio = Boolean(
        ex.isCardio || 
        isCardioCategory(ex.category) || 
        (ex.cardio && ex.cardio.length > 0)
      );
      const machineObj = machines.find(m => m.id === ex.machineId);
      return {
        machineId: ex.machineId,
        name: ex.name,
        description: machineObj?.description || "",
        imageUrl: ex.imageUrl || machineObj?.imageUrl || PRESET_MACHINE_PHOTOS[0],
        imageUrls: (ex.imageUrls && ex.imageUrls.length > 0) ? ex.imageUrls : (machineObj?.imageUrls || []),
        links: (ex.links && ex.links.length > 0) ? ex.links : (machineObj?.links || []),
        category: ex.category || (isCardio ? "Cardio" : "Fuerza"),
        isCardio: isCardio,
        sets: (ex.sets || []).map(s => ({
          setNumber: s.setNumber,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
          rir: s.rir,
          completed: !isToday ? false : Boolean(s.completed) // Reset completion if repeating
        })),
        cardio: (ex.cardio || []).map(c => ({
          blockNumber: c.blockNumber,
          durationMinutes: Number(c.durationMinutes) || 0,
          intensity: c.intensity || "Moderada",
          distanceKm: Number(c.distanceKm) || 0,
          caloriesKcal: Number(c.caloriesKcal) || 0,
          speedKmh: c.speedKmh !== undefined ? Number(c.speedKmh) : undefined,
          inclinePct: c.inclinePct !== undefined ? Number(c.inclinePct) : undefined,
          completed: !isToday ? false : Boolean(c.completed)
        }))
      };
    });

    // Merge if necessary, otherwise just use restored
    const finalExercises = [...baseExercises, ...restoredExercises];

    setActiveExercises(finalExercises);
    setSessionNotes(baseNotes);
    setIsSessionActive(true);
    setIsTimerStarted(true);
    setIsPaused(false);
    
    setAccumulatedSeconds(baseDuration);
    setElapsedSeconds(baseDuration);
    setLastResumeTimestamp(Date.now());
    setSessionStartTime(baseStartTime);
    setSessionStartTimestamp(Date.now() - (baseDuration * 1000));
    setResumingLogId(targetLogId);
    setActiveSubTab("workout");
  };

  const handleCancelSession = () => {
    setConfirmDialog({
      message: "¿Descartar el entrenamiento libre en curso?",
      action: () => {
        setIsSessionActive(false);
        setIsTimerStarted(false);
        setSessionStartTime(null);
        setSessionStartTimestamp(null);
        setLastResumeTimestamp(null);
        setAccumulatedSeconds(0);
        setElapsedSeconds(0);
        setIsPaused(false);
        setActiveExercises([]);
        setSessionNotes("");
        safeRemoveItem("active_free_session");
      }
    });
  };

  // Plan Management
  const handleSavePlan = () => {
    if (!newPlanName.trim()) {
      alert("Por favor, ingresa un nombre para el plan.");
      return;
    }
    if (newPlanMachines.length === 0) {
      alert("Añade al menos una máquina al plan.");
      return;
    }
    
    setSavedPlans(prev => {
      let updated;
      if (editingPlanId) {
        updated = prev.map(p => p.id === editingPlanId ? {
          ...p,
          name: newPlanName.trim(),
          exercises: newPlanMachines.map(m => ({
            machineId: m.id,
            name: m.name,
            imageUrl: m.imageUrl,
            isCardio: m.isCardio,
            category: m.category
          }))
        } : p);
      } else {
        const newPlan = {
          id: "plan_" + Date.now(),
          name: newPlanName.trim(),
          exercises: newPlanMachines.map(m => ({
            machineId: m.id,
            name: m.name,
            imageUrl: m.imageUrl,
            isCardio: m.isCardio,
            category: m.category
          })),
          createdAt: new Date().toISOString()
        };
        updated = [newPlan, ...prev];
      }
      safeSetItem("cached_saved_workout_plans", JSON.stringify(updated));
      return updated;
    });

    setNewPlanName("");
    setNewPlanMachines([]);
    setIsCreatingPlan(false);
    setEditingPlanId(null);
  };

  const handleEditPlan = (plan: any) => {
    setNewPlanName(plan.name);
    // Hydrate exercises from catalog to edit
    const hydratedMachines = plan.exercises.map((ex: any) => {
      const match = machines.find(m => m.id === ex.machineId);
      if (match) return match;
      // Fallback
      return {
        id: ex.machineId,
        name: ex.name,
        imageUrl: ex.imageUrl,
        isCardio: ex.isCardio,
        category: ex.category || ["Fuerza"]
      };
    });
    setNewPlanMachines(hydratedMachines);
    setEditingPlanId(plan.id);
    setIsCreatingPlan(true);
  };

  const handleDeletePlan = (planId: string) => {
    setConfirmDialog({
      message: "¿Eliminar este plan de entrenamiento?",
      action: () => {
        setSavedPlans(prev => {
          const updated = prev.filter(p => p.id !== planId);
          safeSetItem("cached_saved_workout_plans", JSON.stringify(updated));
          return updated;
        });
      }
    });
  };

  const moveExerciseInPlan = (index: number, direction: 'up' | 'down') => {
    setNewPlanMachines(prev => {
      const copy = [...prev];
      if (direction === 'up' && index > 0) {
        [copy[index], copy[index - 1]] = [copy[index - 1], copy[index]];
      } else if (direction === 'down' && index < copy.length - 1) {
        [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      }
      return copy;
    });
  };

  const handleActivatePlan = (planId: string) => {
    const plan = savedPlans.find(p => p.id === planId);
    if (!plan) return;
    
    if (!isSessionActive) {
      handleStartSession();
    }
    
    // Add all machines in the plan to active session, preserving existing ones
    const newActiveExercises = [...activeExercises];
    plan.exercises.forEach(pex => {
      // Check if machine already exists in session to avoid duplicates
      if (!newActiveExercises.some(ex => ex.machineId === pex.machineId)) {
        // Find full machine data if available for categories
        const fullMachine = machines.find(m => m.id === pex.machineId);
        
        let initialSets: FreeExerciseSet[] = [];
        let initialCardio: CardioBlock[] = [];
        
        // Use history for default values if available
        const lastPerf = exerciseHistory[pex.machineId];
        
        if (pex.isCardio) {
          let defMins = 15;
          let defInt = "5.0";
          if (lastPerf && lastPerf.cardio && lastPerf.cardio.length > 0) {
            defMins = lastPerf.cardio[0].durationMinutes || 15;
            defInt = lastPerf.cardio[0].intensity || "5.0";
          }
          initialCardio = [{
            blockNumber: 1,
            durationMinutes: defMins,
            intensity: defInt,
            completed: false
          }];
        } else {
          if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
            initialSets = lastPerf.sets.map(s => ({
              ...s,
              completed: false
            }));
          } else {
            initialSets = [{ setNumber: 1, reps: 10, weight: 20, completed: false }];
          }
        }
        
        newActiveExercises.push({
          machineId: pex.machineId,
          name: pex.name,
          description: fullMachine?.description || "",
          imageUrl: pex.imageUrl,
          imageUrls: fullMachine?.imageUrls,
          links: fullMachine?.links,
          category: pex.category || fullMachine?.category,
          isCardio: pex.isCardio,
          sets: initialSets,
          cardio: initialCardio
        });
      }
    });
    
    setActiveExercises(newActiveExercises);
    setActiveSubTab("workout");
  };

  // Delete a logged workout from history
  const handleDeleteWorkoutLog = (id: string) => {
    setConfirmDialog({
      message: "¿Eliminar este registro del historial?",
      action: async () => {
        try {
          await deleteDoc(doc(db, "workoutLogs", id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `workoutLogs/${id}`);
        }
      }
    });
  };

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Categories list
  const categories = ["Todos", "Cardio", "Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core", "Personalizados"];

  const getCategoryCount = (cat: string) => {
    return machines.filter(m => {
      if (cat === "Todos") return true;
      if (cat === "Personalizados") return m.isCustom;
      if (Array.isArray(m.category)) {
        return m.category.some(c => c.toLowerCase() === cat.toLowerCase());
      }
      return (m.category || "").toLowerCase() === cat.toLowerCase();
    }).length;
  };

  // Filtered machines
  const filteredMachines = machines.filter(m => {
    const matchesCategory = selectedCategory === "Todos" 
      ? true 
      : selectedCategory === "Personalizados" 
      ? m.isCustom 
      : Array.isArray(m.category) 
        ? m.category.some(cat => cat.toLowerCase() === selectedCategory.toLowerCase())
        : (m.category || "").toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesSearch = searchQuery.trim() === "" 
      ? true 
      : m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Calendar Helpers
  const formatSpanishDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    
    const dayName = d.toLocaleDateString("es-ES", { weekday: 'long' });
    const monthName = d.toLocaleDateString("es-ES", { month: 'long' });
    
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay}, ${day} de ${monthName} de ${year}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, ...
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Align to Monday = 0
  };

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Helper to normalize any date format (e.g. "2026-08-14" or "2026-08-14T...")
  const normalizeDateKey = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  };

  // Map logs by date string YYYY-MM-DD
  const logsByDate: Record<string, FreeWorkoutLog[]> = {};
  workoutLogs.forEach(log => {
    const key = normalizeDateKey(log.date);
    if (key) {
      if (!logsByDate[key]) {
        logsByDate[key] = [];
      }
      logsByDate[key].push(log);
    }
  });

  return (
    <div className="space-y-6">
      
      <ConfirmModal
        isOpen={confirmDialog !== null}
        message={confirmDialog?.message || ""}
        onConfirm={() => confirmDialog?.action()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Top Banner Navigation Header - Only shown when in freeworkout top tab */}
      {activeTopTab === "freeworkout" && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-red-500" /> Libre & Guiado
                </span>
                {isSessionActive && (
                  isTimerStarted ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En Curso ({formatTime(elapsedSeconds)})
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Sesión Lista ({activeExercises.length} ej.) - Sin Iniciar
                    </span>
                  )
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-sans">
                Entrenamiento Libre
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
                Registra libremente tus máquinas y ejercicios, añade tus series y recuerda automáticamente tus últimos pesos utilizados.
              </p>
            </div>

            {/* Start or Resume Active Session Button */}
            {!isSessionActive ? (
              <button
                onClick={handleStartSession}
                className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-3 px-6 rounded-xl shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 text-sm shrink-0 active:scale-98 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Entreno Libre</span>
              </button>
            ) : !isTimerStarted ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveSubTab("workout")}
                  className="bg-zinc-900 hover:bg-zinc-850 text-zinc-200 font-bold py-2.5 px-4 rounded-xl border border-zinc-800 transition-all flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Dumbbell className="w-4 h-4 text-red-500" />
                  <span>Ver Sesión ({activeExercises.length} ej.)</span>
                </button>
                <button
                  onClick={handleStartTimer}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs cursor-pointer active:scale-98"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Empezar Entrenamiento</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveSubTab("workout")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Dumbbell className="w-4 h-4" />
                  <span>Ver Sesión ({formatTime(elapsedSeconds)})</span>
                </button>
                <button
                  onClick={handleFinishSession}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-red-600/20"
                >
                  Finalizar
                </button>
              </div>
            )}
          </div>

          {/* Subtabs Selector */}
          <div className="flex items-center w-full gap-2 mt-6 border-t border-zinc-900 pt-4 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "workout", label: "Sesión", icon: Dumbbell, badge: isSessionActive ? activeExercises.length : null },
              { id: "machines", label: "Catálogo de Máquinas", icon: Layers, badge: machines.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex-1 py-2 px-1 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer w-full ${
                    isSelected
                      ? "bg-red-600 text-white border border-red-500 shadow-md shadow-red-600/20 font-black uppercase"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {tab.badge !== null && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono shrink-0 ${
                      isSelected ? "bg-black/40 text-white font-bold" : "bg-zinc-900 text-zinc-400"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 1: SESIÓN ACTIVA / WORKOUT SESSION */}
      {activeSubTab === "workout" && (
        <div>
          {!isSessionActive ? (
            (() => {
              const todayFormatted = getTodayFormattedString();
              const todayFinishedLogs = workoutLogs.filter(l => normalizeDateKey(l.date) === todayFormatted);

              if (todayFinishedLogs.length > 0) {
                return (
                  <div className="space-y-6 max-w-3xl mx-auto my-6">
                    {/* Banner indicating finished workout today */}
                    <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Completado Hoy
                              </span>
                              <span className="text-xs text-zinc-500 font-mono">
                                {todayFinishedLogs.length} sesión(es)
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-white mt-1 uppercase">Entrenamiento de hoy finalizado</h3>
                          </div>
                        </div>

                        <button
                          onClick={handleStartSession}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Empezar otra sesión nueva</span>
                        </button>
                      </div>

                      {/* List of today's completed sessions */}
                      <div className="space-y-4">
                        {todayFinishedLogs.map((log, lIdx) => (
                          <div key={log.id} className="bg-black/80 border border-zinc-850 rounded-xl p-4 sm:p-5 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-black text-white uppercase tracking-wider">Sesión #{lIdx + 1}</span>
                                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                                  ⏱ {formatTime(log.durationSeconds)}
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  {log.exercises.length} máquina(s)
                                </span>
                              </div>

                              <button
                                onClick={() => handleResumeSession(log)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider py-2 px-5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all inline-flex items-center gap-2 text-xs cursor-pointer active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Seguir / Reanudar Sesión</span>
                              </button>
                            </div>

                            {/* Exercises summary chips */}
                            <div className="flex flex-wrap gap-2">
                              {log.exercises.map((ex, exIdx) => {
                                const completedSets = (ex.sets || []).filter(s => s.completed).length;
                                const cardioMin = (ex.cardio || []).reduce((sum, c) => sum + (c.durationMinutes || 0), 0);
                                return (
                                  <button
                                    key={exIdx}
                                    type="button"
                                    onClick={() => setSelectedExerciseDetailModal({ log, exercise: ex, activeImageIndex: 0 })}
                                    className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer group active:scale-95 text-left"
                                    title="Ver máquina y series realizadas"
                                  >
                                    <span className="font-bold text-zinc-200 group-hover:text-white">{ex.name}</span>
                                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-red-400">
                                      {ex.isCardio ? `${cardioMin}m` : `${completedSets || ex.sets?.length || 0} series`}
                                    </span>
                                    <Eye className="w-3 h-3 text-zinc-500 group-hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              /* Default empty state */
              return (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                    <Dumbbell className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase">¿Listo para entrenar libremente?</h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Comienza una sesión de entrenamiento libre. Podrás elegir o añadir las máquinas que utilices, poner tu peso, repeticiones y guardar el historial para la próxima vez.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleStartSession}
                      className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-3 px-8 rounded-xl shadow-lg shadow-red-600/20 transition-all inline-flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Empezar Entrenamiento Libre</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* ACTIVE WORKOUT SESSION DASHBOARD */
            <div className="space-y-6">
              
              {/* Session Control Bar */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${
                    isTimerStarted 
                      ? "bg-red-600/10 border-red-500/20 text-red-400" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}>
                    <Clock className={`w-6 h-6 ${isTimerStarted && !isPaused ? "animate-pulse text-emerald-400" : ""}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Tiempo Transcurrido</span>
                      {!isTimerStarted && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold">
                          Cronómetro Detenido
                        </span>
                      )}
                    </div>
                    <span className="text-2xl font-mono font-black text-white">{formatTime(elapsedSeconds)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!isTimerStarted ? (
                    <button
                      onClick={handleStartTimer}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Empezar Entrenamiento</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleTogglePause}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPaused 
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-current text-amber-400" /> : <Pause className="w-4 h-4 text-zinc-400" />}
                      <span>{isPaused ? "Reanudar" : "Pausar"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowSelectMachineModal(true)}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-red-400 hover:text-red-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Ejercicio</span>
                  </button>

                  <button
                    onClick={handleFinishSession}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalizar ({activeExercises.length})</span>
                  </button>

                  <button
                    onClick={handleCancelSession}
                    className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                    title="Descartar entrenamiento"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Informative Banner if timer has not started yet */}
              {!isTimerStarted && activeExercises.length > 0 && (
                <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold block text-white">Has preparado {activeExercises.length} máquina(s) / ejercicio(s)</span>
                      <span className="text-zinc-400">El tiempo aún no ha comenzado. Pulsa "Empezar Entrenamiento" cuando vayas a iniciar tu primera serie.</span>
                    </div>
                  </div>
                  <button
                    onClick={handleStartTimer}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5 active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Empezar Entrenamiento</span>
                  </button>
                </div>
              )}

              {/* Active Exercises List */}
              {activeExercises.length === 0 ? (
                <div className="bg-zinc-950 border border-dashed border-zinc-900 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-zinc-400">Aún no has añadido ninguna máquina o ejercicio a esta sesión.</p>
                  <button
                    onClick={() => setShowSelectMachineModal(true)}
                    className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 font-bold py-2.5 px-5 rounded-xl text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Seleccionar Máquina del Catálogo</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeExercises.map((ex, exIdx) => {
                    const lastPerf = exerciseHistory[ex.machineId];
                    const isCardio = Boolean(
                      ex.isCardio || 
                      isCardioCategory(ex.category)
                    );
                    const completedSetsCount = (ex.sets || []).filter(s => s.completed).length;
                    const completedCardioCount = (ex.cardio || []).filter(c => c.completed).length;
                    const totalCardioMinutes = (ex.cardio || []).reduce((sum, c) => sum + (c.durationMinutes || 0), 0);

                    return (
                      <div 
                        key={ex.machineId}
                        className={`bg-zinc-950 border rounded-2xl overflow-hidden shadow-xl transition-all ${
                          isCardio ? "border-zinc-800" : "border-zinc-900"
                        }`}
                      >
                        {/* Exercise Card Header */}
                        <div className="p-4 sm:p-5 bg-black border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800 group">
                              <img 
                                src={ex.imageUrl || (ex.imageUrls && ex.imageUrls.find(u => !!u)) || PRESET_MACHINE_PHOTOS[0]} 
                                alt={ex.name} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const validUrls = (ex.imageUrls || []).filter(u => !!u);
                                  setZoomedGallery({
                                    urls: validUrls.length > 0 ? validUrls : [ex.imageUrl || PRESET_MACHINE_PHOTOS[0]],
                                    index: 0,
                                    title: ex.name
                                  });
                                }}
                                className="w-full h-full object-cover cursor-pointer"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                                }}
                              />
                              <label 
                                className="absolute bottom-0 right-0 bg-black/80 p-1 rounded-tl-lg text-red-300 cursor-pointer border-t border-l border-zinc-700/50 hover:bg-black hover:text-red-400 transition-colors"
                                title="Cambiar foto de la máquina desde la galería"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Camera className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      compressAndReadImage(file, (base64) => {
                                        handleUpdateMachinePhoto(ex.machineId, base64);
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                  #{exIdx + 1}
                                </span>
                                {isCardio && (
                                  <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 flex items-center gap-1">
                                    <HeartPulse className="w-3 h-3 text-red-400" />
                                    Cárdio
                                  </span>
                                )}
                                <h3 className="text-base font-bold text-white">{ex.name}</h3>
                                <button
                                  onClick={() => handleOpenEditMachine({
                                    id: ex.machineId,
                                    name: ex.name,
                                    category: ex.category || (isCardio ? ["Cardio"] : ["Fuerza"]),
                                    description: ex.description,
                                    imageUrl: ex.imageUrl,
                                    imageUrls: ex.imageUrls,
                                    links: ex.links,
                                    isCardio: isCardio
                                  })}
                                  className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/60 hover:bg-red-900/80 px-2 py-0.5 rounded-md border border-red-800/50 flex items-center gap-1 transition-all cursor-pointer ml-1 font-mono"
                                  title="Editar nombre, descripción, galería o enlaces de esta máquina"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{ex.description}</p>
                              {ex.links && ex.links.length > 0 && (
                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                  {ex.links.map((link, idx) => (
                                    <a 
                                      key={idx} 
                                      href={link} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[9px] bg-blue-900/20 text-blue-400 border border-blue-900/50 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-blue-900/40 transition-colors"
                                      title={link}
                                    >
                                      Enlace {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Recall last history info */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {lastPerf && (
                              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                                <History className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <div className="text-[11px]">
                                  <span className="text-zinc-400 block text-[9px] font-mono uppercase">Última Vez ({lastPerf.date})</span>
                                  {lastPerf.isCardio ? (
                                    <span className="font-bold text-zinc-200">
                                      <span className="text-red-400 font-mono font-bold">
                                        {lastPerf.totalCardioMinutes || lastPerf.cardio?.[0]?.durationMinutes || 0} min
                                      </span>
                                      {lastPerf.lastIntensity || lastPerf.cardio?.[0]?.intensity ? ` • ${lastPerf.lastIntensity || lastPerf.cardio?.[0]?.intensity}` : ''}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-zinc-200">
                                      {lastPerf.sets?.length || 0} series | Máx: <span className="text-red-400 font-mono">{lastPerf.maxWeight} kg</span>
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLastPerformance(ex.machineId)}
                                  className="ml-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer uppercase font-mono"
                                  title="Copiar valores de la última vez"
                                >
                                  Copiar
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-1 border border-zinc-800 bg-zinc-900/50 rounded-xl p-1">
                              <button
                                onClick={() => handleMoveActiveExercise(exIdx, "up")}
                                disabled={exIdx === 0}
                                className={`p-1.5 rounded-lg transition-colors ${exIdx === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer'}`}
                                title="Mover arriba"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveActiveExercise(exIdx, "down")}
                                disabled={exIdx === activeExercises.length - 1}
                                className={`p-1.5 rounded-lg transition-colors ${exIdx === activeExercises.length - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer'}`}
                                title="Mover abajo"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
                              <button
                                onClick={() => handleRemoveExerciseFromSession(ex.machineId)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Quitar ejercicio de la sesión"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* RENDER CARDIO VS STRENGTH UI */}
                        {isCardio ? (
                          /* CARDIO UI: TRACKED BY TIME (DURATION) AND INTENSITY */
                          <div className="p-4 sm:p-5 space-y-4 bg-gradient-to-b from-red-950/10 to-transparent">
                            {/* Cardio Notice Banner */}
                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-300">
                              <div className="flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-[11px] font-medium">
                                  Máquina de Cárdio: registro por <strong>Tiempo (minutos)</strong> e <strong>Intensidad / Nivel</strong>.
                                </span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-red-400 shrink-0">
                                Total: {totalCardioMinutes} min
                              </span>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-zinc-400 px-2 font-bold tracking-wider">
                              <div className="col-span-2 text-center">Bloque</div>
                              <div className="col-span-3 text-center">Duración (min)</div>
                              <div className="col-span-4 text-center">Intensidad / Nivel</div>
                              <div className="col-span-3 text-center">Hecho</div>
                            </div>

                            {/* Cardio Blocks List */}
                            <div className="space-y-3">
                              {(ex.cardio || []).map((block, bIdx) => (
                                <div 
                                  key={bIdx}
                                  className={`p-3 rounded-xl transition-colors border space-y-2.5 ${
                                    block.completed 
                                      ? "bg-emerald-950/20 border-emerald-500/30" 
                                      : "bg-black border-zinc-850 hover:border-red-500/40"
                                  }`}
                                >
                                  {/* Main row: Block, Duration, Intensity, Done */}
                                  <div className="grid grid-cols-12 gap-2 items-center">
                                    {/* Block number */}
                                    <div className="col-span-2 text-center font-mono font-bold text-xs text-red-400 flex items-center justify-center gap-1">
                                      <Timer className="w-3.5 h-3.5 text-red-500" />
                                      <span>#{block.blockNumber || bIdx + 1}</span>
                                    </div>
                                    {/* Duration Input (Minutes) */}
                                    <div className="col-span-3 flex justify-center items-center gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={block.durationMinutes || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          handleUpdateCardio(ex.machineId, bIdx, "durationMinutes", val === '' ? '' : Math.max(0, parseInt(val) || 0));
                                        }}
                                        placeholder="15"
                                        className="w-[57px] bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-2 text-center text-base sm:text-lg font-mono font-black text-white focus:outline-none focus:border-red-500"
                                      />
                                      <span className="text-[10px] text-red-400 font-mono">min</span>
                                    </div>
                                    {/* Intensity Input (text/level) */}
                                    <div className="col-span-4 flex justify-center items-center gap-1">
                                      <select
                                        value={block.intensity || ''}
                                        onChange={(e) => handleUpdateCardio(ex.machineId, bIdx, "intensity", e.target.value)}
                                        className="w-[63px] bg-zinc-900 border border-zinc-750 rounded-lg px-1 py-2.5 text-sm sm:text-base font-black font-mono text-white focus:outline-none focus:border-red-500 appearance-none text-center"
                                      >
                                        <option value="" disabled>Nivel...</option>
                                        {CARDIO_LEVELS.map(level => (
                                          <option key={level} value={level}>{level}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Completion Checkbox & Delete */}
                                    {/* Completion Checkbox & Delete */}
                                    <div className="col-span-3 flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleCardioComplete(ex.machineId, bIdx)}
                                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                                          block.completed 
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                                            : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                        }`}
                                        title={block.completed ? "Marcado como hecho" : "Marcar bloque completado"}
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>

                                      {(ex.cardio || []).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCardioBlock(ex.machineId, bIdx)}
                                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                          title="Eliminar bloque"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick Intensity Suggestions & Quick Durations */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-900 text-[10px]">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-zinc-500 font-mono">Intensidad:</span>
                                      {["Suave (Nivel 3)", "Moderado (Nivel 6)", "Fuerte (Nivel 9)", "HIIT Intervalos"].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => handleUpdateCardio(ex.machineId, bIdx, "intensity", opt)}
                                          className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all cursor-pointer ${
                                            block.intensity === opt 
                                              ? "bg-red-600 text-white font-bold" 
                                              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800"
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Extra optional details (Distance & Calories) */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-500 font-mono">Km:</span>
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          value={block.distanceKm || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateCardio(ex.machineId, bIdx, "distanceKm", val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                                          }}
                                          placeholder="0"
                                          className="w-14 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-[10px] font-mono text-white"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-zinc-500 font-mono">Kcal:</span>
                                        <input
                                          type="number"
                                          step="5"
                                          min="0"
                                          value={block.caloriesKcal || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateCardio(ex.machineId, bIdx, "caloriesKcal", val === '' ? '' : Math.max(0, parseInt(val) || 0));
                                          }}
                                          placeholder="0"
                                          className="w-14 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-[10px] font-mono text-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Add Cardio Block / Interval button */}
                            <div className="pt-2 flex justify-between items-center text-xs">
                              <span className="text-zinc-400 text-[11px]">
                                Bloques completados: <strong className="text-emerald-400">{completedCardioCount}</strong> / {(ex.cardio || []).length}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleAddCardioBlock(ex.machineId)}
                                className="bg-red-950/80 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-500/30 px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir Intervalo / Bloque</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* STRENGTH UI: SETS & REPETITIONS */
                          <div className="p-4 sm:p-5 space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-[9px] sm:text-[10px] font-mono uppercase text-zinc-400 px-1 sm:px-2 font-bold tracking-wider">
                              <div className="col-span-2 text-center">Serie</div>
                              <div className="col-span-3 text-center">Peso</div>
                              <div className="col-span-3 text-center">Reps</div>
                              <div className="col-span-2 text-center">RIR</div>
                              <div className="col-span-2 text-center">Ok</div>
                            </div>

                            <div className="space-y-2">
                              {ex.sets.map((set, sIdx) => (
                                <div 
                                  key={sIdx}
                                  className={`grid grid-cols-12 gap-1 sm:gap-2 items-center p-1 sm:p-2 rounded-xl transition-colors border ${
                                    set.completed 
                                      ? "bg-emerald-950/20 border-emerald-500/30" 
                                      : "bg-black border-zinc-850 hover:border-zinc-700"
                                  }`}
                                >
                                  {/* Set number */}
                                  <div className="col-span-2 text-center font-mono font-bold text-[10px] sm:text-xs text-zinc-300 flex items-center justify-center gap-1">
                                    <span>#{set.setNumber}</span>
                                  </div>

                                  {/* Weight Input */}
                                  <div className="col-span-3 flex justify-center items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={set.weight || ''}
                                      onChange={(e) => handleUpdateSet(ex.machineId, sIdx, "weight", parseFloat(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-full max-w-[70px] sm:max-w-[90px] bg-zinc-900 border border-zinc-750 rounded-lg px-1 sm:px-2 py-1.5 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                                    />
                                    <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono hidden xl:inline">kg</span>
                                  </div>

                                  {/* Reps Input */}
                                  <div className="col-span-3 flex justify-center items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={set.reps || ''}
                                      onChange={(e) => handleUpdateSet(ex.machineId, sIdx, "reps", parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-full max-w-[70px] sm:max-w-[90px] bg-zinc-900 border border-zinc-750 rounded-lg px-1 sm:px-2 py-1.5 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                                    />
                                    <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono hidden xl:inline">reps</span>
                                  </div>

                                  {/* RIR Select */}
                                  <div className="col-span-2 flex justify-center items-center">
                                    <select
                                      value={set.rir || ""}
                                      onChange={(e) => handleUpdateSet(ex.machineId, sIdx, "rir", e.target.value)}
                                      className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-1 py-1.5 text-center text-[10px] font-mono font-bold text-white focus:outline-none focus:border-red-500 appearance-none"
                                      style={{ textAlignLast: "center" }}
                                    >
                                      <option value="">-</option>
                                      <option value="RIR 5">5</option>
                                      <option value="RIR 4">4</option>
                                      <option value="RIR 3">3</option>
                                      <option value="RIR 2">2</option>
                                      <option value="RIR 1">1</option>
                                      <option value="RIR 0">0</option>
                                      <option value="FALLO">FALLO</option>
                                    </select>
                                  </div>

                                  {/* Completion Checkbox */}
                                  <div className="col-span-2 flex items-center justify-center gap-0 sm:gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSetComplete(ex.machineId, sIdx)}
                                      className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                                        set.completed 
                                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                                          : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                      }`}
                                      title={set.completed ? "Marcado como hecho" : "Marcar serie completada"}
                                    >
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    {ex.sets.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSetFromExercise(ex.machineId, sIdx)}
                                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                        title="Eliminar serie"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Add set button */}
                            <div className="pt-2 flex justify-between items-center text-xs">
                              <span className="text-zinc-400 text-[11px]">
                                Completadas: <strong className="text-emerald-400">{completedSetsCount}</strong> / {ex.sets.length} series
                              </span>

                              <button
                                type="button"
                                onClick={() => handleAddSetToExercise(ex.machineId)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-red-300 border border-zinc-800 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer text-xs font-mono"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir Serie</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* OBSERVACIONES (STRENGTH AND CARDIO) */}
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                          <div className="border-t border-zinc-800/50 pt-4 space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              Observaciones para esta máquina
                            </label>
                            {lastPerf?.notes && (
                              <div className="bg-amber-950/20 border border-amber-500/10 text-amber-300 text-[11px] px-3 py-2 rounded-lg leading-snug">
                                <span className="font-bold">Nota anterior:</span> {lastPerf.notes}
                              </div>
                            )}
                            <textarea
                              value={ex.notes || ''}
                              onChange={(e) => handleUpdateExerciseNotes(ex.machineId, e.target.value)}
                              placeholder="Ej: Asiento en el 4, molestia leve, etc."
                              className="w-full bg-black border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors resize-none h-14"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Add Exercise Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-zinc-900">
                    <button
                      onClick={() => setShowSelectMachineModal(true)}
                      className="w-full sm:w-auto bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-red-400 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer font-mono"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir otra Máquina / Ejercicio</span>
                    </button>

                    <button
                      onClick={handleFinishSession}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-3 px-8 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar Entrenamiento y Guardar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CATÁLOGO DE MÁQUINAS Y EJERCICIOS */}
      {activeSubTab === "machines" && (
        <div className="space-y-6">
          
          {/* Controls: Search, Category Filter & Add Machine */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar máquina o ejercicio..."
                className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Action to Add New Machine */}
            <button
              onClick={() => setShowAddMachineModal(true)}
              className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Nueva Máquina</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex flex-col items-center justify-center min-w-[70px] ${
                    selectedCategory === cat 
                      ? "bg-red-600 text-white border border-red-500 shadow-md shadow-red-600/20 font-black" 
                      : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-900"
                  }`}
                >
                  <span className="uppercase">{cat}</span>
                  <span className={`text-[10px] font-mono leading-none mt-1 ${selectedCategory === cat ? "text-red-200" : "text-zinc-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((machine) => {
              const lastPerf = exerciseHistory[machine.id];
              return (
                <div 
                  key={machine.id}
                  className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-2xl overflow-hidden transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="relative h-44 bg-black overflow-hidden">
                    <MachineImageCarousel 
                      imageUrls={machine.imageUrls && machine.imageUrls.length > 0 ? machine.imageUrls : (machine.imageUrl ? [machine.imageUrl] : [])} 
                      onImageClick={(idx) => setZoomedGallery({
                        urls: machine.imageUrls && machine.imageUrls.length > 0 ? machine.imageUrls : (machine.imageUrl ? [machine.imageUrl] : []),
                        index: idx,
                        title: machine.name
                      })}
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[75%]">
                      {getCategoryList(machine.category).map((cat, catIdx) => (
                        <span key={catIdx} className="bg-black/80 backdrop-blur-md border border-zinc-700/60 text-red-400 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Change photo from device gallery button overlay */}
                    <label 
                      className="absolute bottom-3 right-3 bg-black/80 hover:bg-red-600 text-zinc-300 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-700/80 backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shadow-lg active:scale-95"
                      title="Cambiar la foto de esta máquina desde la galería de tu dispositivo"
                    >
                      <Camera className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
                      <span>Cambiar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressAndReadImage(file, (base64) => {
                              handleUpdateMachinePhoto(machine.id, base64);
                            });
                          }
                        }}
                      />
                    </label>

                    {/* Delete Machine Button Overlay (allows deleting any machine) */}
                    <button
                      onClick={() => handleDeleteMachine(machine.id)}
                      className="absolute top-3 right-3 p-1.5 bg-black/80 hover:bg-red-950/80 text-zinc-400 hover:text-red-400 rounded-lg transition-colors border border-zinc-800 cursor-pointer shadow-lg active:scale-95"
                      title="Eliminar máquina del catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                          {machine.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditMachine(machine)}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-2 py-1 rounded-lg border border-red-800/40 flex items-center gap-1 transition-all cursor-pointer font-mono"
                            title="Editar descripción, foto o datos de la máquina"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {machine.description}
                      </p>
                      {machine.links && machine.links.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {machine.links.map((link, idx) => (
                            <a 
                              key={idx} 
                              href={link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[9px] bg-blue-900/20 text-blue-400 border border-blue-900/50 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-blue-900/40 transition-colors"
                              title={link}
                            >
                              Enlace {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Last Performance Record Badge */}
                    {lastPerf && (
                      <div className="bg-black border border-zinc-850 p-2 rounded-xl text-[11px] text-zinc-300 flex items-center justify-between">
                        <span className="text-zinc-500 font-mono text-[10px]">Última vez ({lastPerf.date}):</span>
                        <span className="font-bold text-red-400 font-mono">{lastPerf.maxWeight} kg</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          if (!isSessionActive) {
                            handleStartSession();
                          }
                          addMachineToActiveSession(machine);
                          setActiveSubTab("workout");
                        }}
                        className="w-full bg-zinc-900 hover:bg-red-600 text-zinc-200 hover:text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono uppercase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Usar en Entrenamiento</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset catalog option */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleResetDefaultMachines}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer transition-colors"
            >
              Restablecer máquinas predeterminadas del gimnasio
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CALENDARIO Y REGISTRO HISTÓRICO */}
      {activeSubTab === "calendar" && (
        <div className="space-y-6">
          {/* Dedicated Clean Header for Calendar & History */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-1 relative z-10">
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-red-500" /> Registro de Actividad
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-sans">
                Calendario e Historial
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
                Consulta tus sesiones realizadas por día, series completadas, pesos y tiempos de entrenamiento.
              </p>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-black/60 border border-zinc-800 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Total Sesiones</span>
                <span className="text-sm font-mono font-bold text-red-400">{workoutLogs.length}</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 px-3.5 py-2 rounded-xl text-center">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">Días Activos</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{Object.keys(logsByDate).length}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Monthly Calendar Widget */}
            <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-4">
              
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-red-500" />
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedCalendarDate(getTodayFormattedString())}
                    className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-bold rounded-lg transition-colors cursor-pointer font-mono"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer border border-zinc-800"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer border border-zinc-800"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider py-1 border-b border-zinc-900">
                <span>LUN</span>
                <span>MAR</span>
                <span>MIÉ</span>
                <span>JUE</span>
                <span>VIE</span>
                <span>SÁB</span>
                <span>DOM</span>
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty padding cells before 1st of month */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty_${idx}`} className="h-14 bg-black/40 rounded-xl" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayLogs = logsByDate[dateString] || [];
                  const hasLogs = dayLogs.length > 0;
                  const totalDurationSecs = dayLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

                  const isSelected = selectedCalendarDate === dateString;
                  const isToday = dateString === getTodayFormattedString();

                  return (
                    <button
                      key={`day_${dayNum}`}
                      onClick={() => setSelectedCalendarDate(dateString)}
                      className={`h-14 p-1.5 rounded-xl border transition-all flex flex-col justify-between items-start text-left cursor-pointer relative ${
                        isSelected 
                          ? "bg-red-600/20 border-red-500 ring-2 ring-red-500/50 shadow-md shadow-red-500/20" 
                          : hasLogs 
                          ? "bg-zinc-900 border-red-500/50 hover:border-red-400" 
                          : "bg-black border-zinc-900 hover:bg-zinc-900/60 text-zinc-500"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold ${
                          isSelected ? "text-red-400 font-black" : hasLogs ? "text-white" : "text-zinc-500"
                        }`}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="bg-red-600 text-white text-[8px] font-mono font-black px-1 rounded uppercase">
                            HOY
                          </span>
                        )}
                      </div>

                      {hasLogs ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-400">
                            <Flame className="w-3 h-3 fill-red-500 text-red-500" />
                            {Math.round(totalDurationSecs / 60)}m
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>
                      ) : isSelected ? (
                        <span className="text-[9px] text-red-400/80 font-mono">Seleccionado</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-zinc-400 border-t border-zinc-900">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-red-600/30 border border-red-500/50" />
                    <span>Día con entreno</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    <span>Duración total</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 italic">Haz clic en cualquier día para ver qué se hizo</span>
              </div>
            </div>

            {/* Right: Selected Day Workout Breakdown */}
            <div className="lg:col-span-5 space-y-4">
              {(() => {
                const selectedDayLogs = workoutLogs.filter(log => normalizeDateKey(log.date) === selectedCalendarDate);
                const hasLogsForSelectedDay = selectedDayLogs.length > 0;
                const isTodaySelected = selectedCalendarDate === getTodayFormattedString();

                return (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-4">
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-black block">
                          Actividad del Día
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-white capitalize">
                          {formatSpanishDate(selectedCalendarDate)}
                        </h3>
                      </div>
                      {isTodaySelected && (
                        <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full shrink-0">
                          Hoy
                        </span>
                      )}
                    </div>

                    {hasLogsForSelectedDay ? (
                      <div className="space-y-4">
                        {/* Day Overview Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Tiempo Total</span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-red-400">
                              {formatTime(selectedDayLogs.reduce((acc, l) => acc + l.durationSeconds, 0))}
                            </span>
                          </div>
                          <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Sesiones</span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                              {selectedDayLogs.length} entreno(s)
                            </span>
                          </div>
                          <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Máquinas</span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-red-400">
                              {selectedDayLogs.reduce((acc, l) => acc + l.exercises.length, 0)} ej.
                            </span>
                          </div>
                        </div>

                        {/* List of workout logs for this selected day */}
                        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                          {selectedDayLogs.map((log, logIdx) => {
                            const sessionFocus = calculateSessionMuscleFocus(log.exercises);

                            return (
                              <div key={log.id} className="bg-black border border-zinc-850 rounded-xl p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-2.5 gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 shrink-0" />
                                      <span className="text-xs font-black text-white uppercase tracking-wider">Sesión #{logIdx + 1}</span>
                                      <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                                        ⏱ {formatTime(log.durationSeconds)}
                                      </span>
                                    </div>
                                    {/* Focus Title */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-red-400 font-sans">
                                        {sessionFocus.title}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {sessionFocus.primaryGroups.map((grp, gIdx) => {
                                          const badge = getCategoryBadge(grp);
                                          return (
                                            <span key={gIdx} className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${badge.badgeClass}`}>
                                              {grp}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    {isTodaySelected && (
                                      <button
                                        onClick={() => handleResumeSession(log)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                                        title="Continuar este entrenamiento hoy"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Seguir</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteWorkoutLog(log.id)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                      title="Eliminar esta sesión de entrenamiento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Exercises list */}
                                <div className="space-y-3">
                                  {log.exercises.map((ex, exIdx) => {
                                    const itemKey = `${log.id}_ex_${exIdx}`;
                                    const isExpanded = expandedCalendarExerciseId === itemKey;
                                    const machineObj = machines.find(m => m.id === ex.machineId);
                                    const isCardio = Boolean(
                                      ex.isCardio || 
                                      isCardioCategory(ex.category) ||
                                      (ex.cardio && ex.cardio.length > 0)
                                    );
                                    const categories = getExerciseCategories(ex);

                                  const photoUrl = ex.imageUrl || (ex.imageUrls && ex.imageUrls[0]) || machineObj?.imageUrl || (machineObj?.imageUrls && machineObj?.imageUrls[0]) || PRESET_MACHINE_PHOTOS[0];
                                  const allPhotos = (ex.imageUrls && ex.imageUrls.length > 0) 
                                    ? ex.imageUrls 
                                    : (machineObj?.imageUrls && machineObj?.imageUrls.length > 0) 
                                      ? machineObj.imageUrls 
                                      : [photoUrl];

                                  const totalSets = (ex.sets || []).length;
                                  const completedSetsCount = (ex.sets || []).filter(s => s.completed).length;
                                  const maxWeightLifted = (ex.sets || []).reduce((max, s) => Math.max(max, Number(s.weight) || 0), 0);
                                  const totalVolumeLifted = (ex.sets || []).reduce((acc, s) => acc + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0);
                                  const totalReps = (ex.sets || []).reduce((acc, s) => acc + (Number(s.reps) || 0), 0);
                                  const totalCardioMinutes = (ex.cardio || []).reduce((sum, c) => sum + (Number(c.durationMinutes) || 0), 0);

                                  return (
                                    <div 
                                      key={exIdx} 
                                      className={`rounded-xl transition-all border ${
                                        isExpanded 
                                          ? "bg-zinc-950 border-red-500/40 shadow-lg shadow-red-950/20 ring-1 ring-red-500/20" 
                                          : "bg-zinc-950/80 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/60"
                                      }`}
                                    >
                                      {/* Clickable Header */}
                                      <div 
                                        onClick={() => setExpandedCalendarExerciseId(prev => prev === itemKey ? null : itemKey)}
                                        className="p-3.5 flex items-center justify-between cursor-pointer select-none group"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="relative shrink-0">
                                            <img 
                                              src={photoUrl} 
                                              alt={ex.name} 
                                              className="w-10 h-10 rounded-xl object-cover border border-zinc-800 group-hover:border-red-500/50 transition-colors shadow-sm"
                                              onError={(e) => {
                                                (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                                              }}
                                            />
                                            {allPhotos.length > 1 && (
                                              <span className="absolute -bottom-1 -right-1 bg-black/90 text-zinc-300 border border-zinc-700 text-[8px] font-mono font-bold px-1 rounded-full">
                                                +{allPhotos.length - 1}
                                              </span>
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs sm:text-sm font-black text-zinc-100 group-hover:text-white transition-colors">
                                                {ex.name}
                                              </span>
                                              {isCardio && (
                                                <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/60 px-1.5 py-0.2 rounded border border-red-500/30 shrink-0">
                                                  Cárdio
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                              {categories.map((cat, cIdx) => {
                                                const badge = getCategoryBadge(cat);
                                                return (
                                                  <span key={cIdx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${badge.badgeClass}`}>
                                                    <span className={`w-1 h-1 rounded-full ${badge.dotClass}`} />
                                                    {cat}
                                                  </span>
                                                );
                                              })}
                                              {!isExpanded && !isCardio && totalSets > 0 && maxWeightLifted > 0 && (
                                                <span className="text-[10px] font-mono text-zinc-400">
                                                  • Máx: <strong className="text-red-400">{maxWeightLifted} kg</strong>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 shadow-sm">
                                            {isCardio 
                                              ? `${totalCardioMinutes} min`
                                              : `${completedSetsCount || totalSets} series`
                                            }
                                          </span>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedExerciseDetailModal({ log, exercise: ex, activeImageIndex: 0 });
                                            }}
                                            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                                            title="Ver en pantalla completa con fotos y datos"
                                          >
                                            <Maximize2 className="w-3.5 h-3.5" />
                                          </button>

                                          <div className={`p-1 text-zinc-400 group-hover:text-red-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-red-400" : ""}`}>
                                            <ChevronDown className="w-4 h-4" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Expanded Body Content */}
                                      {isExpanded && (
                                        <div className="px-3.5 pb-4 pt-1 border-t border-zinc-900 space-y-4 animate-fadeIn">
                                          
                                          {/* Machine Visual Showcase and Details */}
                                          <div className="bg-black/80 border border-zinc-850 rounded-xl p-3.5 flex flex-col sm:flex-row gap-3.5 items-start">
                                            <div className="relative group shrink-0 w-full sm:w-28 h-28 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                                              <img 
                                                src={photoUrl} 
                                                alt={ex.name} 
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => setZoomedGallery({ urls: allPhotos, index: 0, title: ex.name })}
                                                onError={(e) => {
                                                  (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => setZoomedGallery({ urls: allPhotos, index: 0, title: ex.name })}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer gap-1"
                                              >
                                                <Eye className="w-4 h-4" />
                                                <span>Ver Foto</span>
                                              </button>
                                            </div>

                                            <div className="space-y-2 flex-1 min-w-0">
                                              <div>
                                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                                                  Máquina / Ejercicio
                                                </span>
                                                <h4 className="text-sm font-black text-white">{ex.name}</h4>
                                              </div>

                                              {machineObj?.description && (
                                                <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-900">
                                                  {machineObj.description}
                                                </p>
                                              )}

                                              {/* Categories and Links */}
                                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                                  {formatCategories(ex.category || (isCardio ? "Cardio" : "Fuerza"))}
                                                </span>

                                                {(ex.links || machineObj?.links || []).map((link, lIdx) => (
                                                  <a
                                                    key={lIdx}
                                                    href={link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 bg-blue-950/30 border border-blue-800/40 px-2 py-0.5 rounded inline-flex items-center gap-1"
                                                  >
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                    <span>Tutorial #{lIdx + 1}</span>
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          {/* SERIES DETALLADAS O BLOQUES DE CARDIO */}
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-red-500" />
                                                {isCardio ? "Bloques de Cardio Realizados" : "Series y Cargas Realizadas"}
                                              </span>
                                              <span className="text-[10px] font-mono text-zinc-500">
                                                {isCardio ? `${(ex.cardio || []).length} bloque(s)` : `${totalSets} serie(s)`}
                                              </span>
                                            </div>

                                            {isCardio ? (
                                              /* Cardio Blocks detailed list */
                                              <div className="space-y-2">
                                                {(ex.cardio || []).map((c, cIdx) => (
                                                  <div key={cIdx} className="bg-black border border-zinc-850 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                      <span className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-mono font-black flex items-center justify-center">
                                                        #{c.blockNumber || cIdx + 1}
                                                      </span>
                                                      <div>
                                                        <span className="text-sm font-black text-white font-mono">
                                                          {c.durationMinutes} min
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400 block font-mono">
                                                          Intensidad: <strong className="text-red-400">{c.intensity || 'Normal'}</strong>
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                                                      {c.speedKmh !== undefined && (
                                                        <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-300 border border-zinc-800">
                                                          {c.speedKmh} km/h
                                                        </span>
                                                      )}
                                                      {c.inclinePct !== undefined && (
                                                        <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-300 border border-zinc-800">
                                                          {c.inclinePct}% inc.
                                                        </span>
                                                      )}
                                                      {c.distanceKm !== undefined && Number(c.distanceKm) > 0 && (
                                                        <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-300 border border-zinc-800">
                                                          {c.distanceKm} km
                                                        </span>
                                                      )}
                                                      {c.caloriesKcal !== undefined && Number(c.caloriesKcal) > 0 && (
                                                        <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-300 border border-zinc-800">
                                                          {c.caloriesKcal} kcal
                                                        </span>
                                                      )}
                                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 p-1 rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3" />
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              /* Strength Sets Detailed Table / Cards */
                                              <div className="space-y-2">
                                                {/* Header row */}
                                                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-mono text-zinc-500 uppercase font-bold bg-black/40 rounded-lg border border-zinc-900">
                                                  <div className="col-span-2">Serie</div>
                                                  <div className="col-span-3 text-center">Carga (kg)</div>
                                                  <div className="col-span-3 text-center">Reps</div>
                                                  <div className="col-span-2 text-center">RIR</div>
                                                  <div className="col-span-2 text-right">Estado</div>
                                                </div>

                                                {(ex.sets || []).map((s, sIdx) => (
                                                  <div 
                                                    key={sIdx}
                                                    className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-black border border-zinc-850 rounded-xl text-xs font-mono"
                                                  >
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                      <span className="w-5 h-5 rounded-md bg-zinc-900 text-zinc-300 font-bold flex items-center justify-center text-[10px] border border-zinc-800">
                                                        {s.setNumber || sIdx + 1}
                                                      </span>
                                                    </div>

                                                    <div className="col-span-3 text-center">
                                                      <span className="text-sm font-black text-red-400">
                                                        {s.weight} <span className="text-[10px] font-normal text-zinc-500">kg</span>
                                                      </span>
                                                    </div>

                                                    <div className="col-span-3 text-center">
                                                      <span className="text-xs font-bold text-white">
                                                        {s.reps} <span className="text-[10px] font-normal text-zinc-500">reps</span>
                                                      </span>
                                                    </div>

                                                    <div className="col-span-2 text-center">
                                                      {s.rir !== undefined && s.rir !== "" ? (
                                                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                                          {s.rir.startsWith("RIR") ? s.rir : `RIR ${s.rir}`}
                                                        </span>
                                                      ) : (
                                                        <span className="text-zinc-600 text-[10px]">-</span>
                                                      )}
                                                    </div>

                                                    <div className="col-span-2 text-right flex justify-end">
                                                      {s.completed ? (
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 p-1 rounded-full flex items-center justify-center">
                                                          <Check className="w-3 h-3" />
                                                        </span>
                                                      ) : (
                                                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                                                          Pend.
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}

                                                {/* Metrics summary bar */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 text-center">
                                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Volumen Total</span>
                                                    <span className="text-xs font-mono font-bold text-red-400">{totalVolumeLifted.toLocaleString()} kg</span>
                                                  </div>
                                                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 text-center">
                                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Carga Máxima</span>
                                                    <span className="text-xs font-mono font-bold text-white">{maxWeightLifted} kg</span>
                                                  </div>
                                                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 text-center">
                                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Reps Totales</span>
                                                    <span className="text-xs font-mono font-bold text-zinc-300">{totalReps}</span>
                                                  </div>
                                                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 text-center">
                                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Series Realizadas</span>
                                                    <span className="text-xs font-mono font-bold text-emerald-400">{completedSetsCount} / {totalSets}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Button to open Fullscreen Modal */}
                                          <div className="pt-1 flex justify-end">
                                            <button
                                              type="button"
                                              onClick={() => setSelectedExerciseDetailModal({ log, exercise: ex, activeImageIndex: 0 })}
                                              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                              <Maximize2 className="w-3 h-3 text-red-500" />
                                              <span>Abrir detalle completo</span>
                                            </button>
                                          </div>

                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {log.notes && (
                                <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-lg text-[11px] text-zinc-400 italic">
                                  "{log.notes}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    ) : (
                      /* Empty State for Selected Day with No Workouts */
                      <div className="py-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-black border border-zinc-850 flex items-center justify-center mx-auto text-zinc-600">
                          <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-zinc-300">Sin entrenamientos registrados</h4>
                          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                            No realizaste ni registraste ningún entrenamiento libre el día <strong className="text-zinc-400">{selectedCalendarDate}</strong>.
                          </p>
                        </div>

                        {isTodaySelected ? (
                          <button
                            onClick={() => {
                              if (!isSessionActive) {
                                handleStartSession();
                              }
                              setActiveSubTab("workout");
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-2.5 px-5 rounded-xl text-xs transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20 active:scale-98"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Registrar Entrenamiento Hoy</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveSubTab("machines")}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer border border-zinc-800 font-mono"
                          >
                            <Dumbbell className="w-3.5 h-3.5 text-red-500" />
                            <span>Ver Catálogo de Máquinas</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 4: PLANIFICAR */}
      {activeSubTab === "plan" && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="space-y-1">
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1">
                  <Edit2 className="w-3 h-3 text-red-500" /> Creador de Rutinas
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-sans">
                  Tus Planes
                </h1>
              </div>
              <button
                onClick={() => setIsCreatingPlan(!isCreatingPlan)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 font-mono uppercase shadow-lg shadow-red-600/20"
              >
                {isCreatingPlan ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isCreatingPlan ? "Cancelar Creación" : "Crear Nuevo Plan"}</span>
              </button>
            </div>
            
            {/* Create Plan Builder */}
            {isCreatingPlan && (
              <div className="mt-6 p-4 sm:p-5 bg-black/40 border border-zinc-800 rounded-2xl relative z-10 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                    Nombre del Plan
                  </label>
                  <input
                    type="text"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="Ej. Espalda y Bíceps"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      Máquinas en el Plan ({newPlanMachines.length})
                    </label>
                    <button
                      onClick={() => setShowPlanMachineSelector(true)}
                      className="text-[10px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Añadir del Catálogo
                    </button>
                  </div>
                  
                  {newPlanMachines.length === 0 ? (
                    <div className="p-6 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 bg-zinc-900/30">
                      <Layers className="w-8 h-8 opacity-50" />
                      <span className="text-xs font-mono">El plan está vacío</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newPlanMachines.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 pl-3 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-zinc-500">{idx + 1}.</span>
                            <span className="text-xs font-bold text-white">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveExerciseInPlan(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveExerciseInPlan(idx, 'down')}
                              disabled={idx === newPlanMachines.length - 1}
                              className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-zinc-800 mx-1" />
                            <button
                              onClick={() => setNewPlanMachines(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSavePlan}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md shadow-red-600/20"
                  >
                    Guardar Plan
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Saved Plans List */}
          <div className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Layers className="w-4 h-4 text-red-500" />
              Tus Planes Guardados
            </h2>
            
            {savedPlans.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 bg-red-950/30 border border-red-500/20 rounded-full flex items-center justify-center mb-2">
                  <Edit2 className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-sm font-bold text-zinc-300">No tienes planes guardados</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Crea un plan agrupando las máquinas que usas habitualmente para cargarlas rápidamente de una vez.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col h-full hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-black text-white">{plan.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="text-zinc-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
                          title="Modificar Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
                          title="Eliminar Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1 mb-4">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                        Máquinas ({plan.exercises.length}):
                      </span>
                      {plan.exercises.slice(0, 4).map((ex, i) => (
                        <div key={i} className="text-xs text-zinc-300 truncate flex items-center gap-1.5">
                          <span className="w-1 h-1 bg-zinc-700 rounded-full shrink-0" />
                          {ex.name}
                        </div>
                      ))}
                      {plan.exercises.length > 4 && (
                        <div className="text-xs text-zinc-500 italic pl-2.5">
                          + {plan.exercises.length - 4} más...
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleActivatePlan(plan.id)}
                      className="w-full bg-zinc-900 hover:bg-red-600 hover:border-red-500 border border-zinc-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all uppercase tracking-wider font-mono flex items-center justify-center gap-2 group"
                    >
                      <Play className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span>Activar en Entrenamiento Libre</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: AÑADIR NUEVA MÁQUINA / EJERCICIO AL CATÁLOGO */}
      {showAddMachineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-10 pb-24 overflow-y-auto min-h-screen">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Dumbbell className="w-5 h-5 text-red-500" />
                Añadir Máquina o Ejercicio Personalizado
              </h3>
              <button
                onClick={() => setShowAddMachineModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="space-y-4">
              
              {/* Name input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nombre de la Máquina / Ejercicio *</label>
                <input
                  type="text"
                  required
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  placeholder="Ej: Prensa Horizontal Panatta, Remo Gironda, ..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Category input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Grupos / Categorías</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Cardio", "Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core", "Personalizados / Otros"].map((cat) => {
                    const isSelected = newMachineCategory.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewMachineCategory(prev => prev.length > 1 ? prev.filter(c => c !== cat) : prev);
                          } else {
                            setNewMachineCategory(prev => [...prev, cat]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
                {newMachineCategory.some(c => c.toLowerCase().includes("cardio")) && (
                  <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/20 p-2 rounded-lg flex items-center gap-1.5 mt-2">
                    <HeartPulse className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>Las máquinas de <strong>Cárdio</strong> se registran por <strong>Tiempo (min)</strong> e <strong>Intensidad</strong>.</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Pequeña Descripción</label>
                <textarea
                  rows={2}
                  value={newMachineDesc}
                  onChange={(e) => setNewMachineDesc(e.target.value)}
                  placeholder="Breve explicación del ajuste de la máquina o técnica..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Photo selector / Gallery Upload / URL */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block">Fotos de la Máquina (Opcional)</label>
                
                {/* Device Gallery Upload Button */}
                <div className="bg-black border border-zinc-850 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">Añadir foto de la Galería</span>
                      <span className="text-[10px] text-zinc-400 block">Sube una o más fotos</span>
                    </div>
                    <label className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0 active:scale-98">
                      <Camera className="w-4 h-4" />
                      <span>Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressAndReadImage(file, (base64) => {
                              setNewMachineGallery(prev => [...prev, base64]);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageInput}
                      onChange={(e) => setNewImageInput(e.target.value)}
                      placeholder="O pega una URL de imagen..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newImageInput.trim()) {
                          setNewMachineGallery(prev => [...prev, newImageInput.trim()]);
                          setNewImageInput("");
                        }
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>

                  {/* Selected Gallery Photos */}
                  {newMachineGallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {newMachineGallery.map((photoUrl, idx) => (
                        <div key={idx} className={`relative rounded-lg overflow-hidden border ${idx === 0 ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800'} h-20 bg-zinc-900 group`}>
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className={`absolute top-1 left-1 px-1 rounded text-[9px] font-mono ${idx === 0 ? 'bg-red-600 text-white' : 'bg-black/60 text-zinc-300'}`}>
                            {idx === 0 ? "Principal" : `#${idx+1}`}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setNewMachineGallery(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-black/80 hover:bg-red-950 text-zinc-300 hover:text-red-400 p-1 rounded border border-zinc-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewMachineGallery(prev => {
                                  const arr = [...prev];
                                  const item = arr.splice(idx, 1)[0];
                                  arr.unshift(item);
                                  return arr;
                                });
                              }}
                              className="absolute bottom-1 inset-x-1 bg-black/80 hover:bg-zinc-700 text-white text-[9px] py-1 rounded text-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Hacer Principal
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Links section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block">Enlaces web / Tutoriales (Opcional)</label>
                <div className="bg-black border border-zinc-850 rounded-xl p-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newLinkInput}
                      onChange={(e) => setNewLinkInput(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newLinkInput.trim()) {
                          setNewMachineLinks(prev => [...prev, newLinkInput.trim()]);
                          setNewLinkInput("");
                        }
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>

                  {/* Added Links */}
                  {newMachineLinks.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {newMachineLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs">
                          <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate flex-1 block pr-2">
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => setNewMachineLinks(prev => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  Guardar Máquina
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MÁQUINA / EJERCICIO */}
      {editingMachine && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-start justify-center p-4 pt-10 pb-24 overflow-y-auto min-h-screen">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">Editar Máquina / Ejercicio</h3>
                  <p className="text-xs text-zinc-400">Modifica el nombre, descripción y fotos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMachine(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedMachine} className="space-y-4">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nombre de la Máquina</label>
                <input
                  type="text"
                  required
                  value={editMachineName}
                  onChange={(e) => setEditMachineName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Grupos / Categorías</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Cardio", "Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core", "Personalizados / Otros"].map((cat) => {
                    const isSelected = editMachineCategory.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditMachineCategory(prev => prev.length > 1 ? prev.filter(c => c !== cat) : prev);
                          } else {
                            setEditMachineCategory(prev => [...prev, cat]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
                {editMachineCategory.some(c => c.toLowerCase().includes("cardio")) && (
                  <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/20 p-2 rounded-lg flex items-center gap-1.5 mt-2">
                    <HeartPulse className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>Las máquinas de <strong>Cárdio</strong> se registran por <strong>Tiempo (min)</strong> e <strong>Intensidad</strong>.</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Descripción / Instrucciones de Uso</label>
                <textarea
                  rows={3}
                  value={editMachineDesc}
                  onChange={(e) => setEditMachineDesc(e.target.value)}
                  placeholder="Añade detalles sobre el ajuste del asiento, posición de poleas o técnica..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Photo Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block">Fotos de la Máquina</label>

                {/* Device Gallery Upload Button */}
                <div className="bg-black border border-zinc-850 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">Añadir foto de la Galería</span>
                      <span className="text-[10px] text-zinc-400 block">Sube una o más fotos</span>
                    </div>
                    <label className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0 active:scale-98">
                      <Camera className="w-4 h-4" />
                      <span>Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressAndReadImage(file, (base64) => {
                              setEditMachineGallery(prev => [...prev, base64]);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editImageInput}
                      onChange={(e) => setEditImageInput(e.target.value)}
                      placeholder="O pega una URL de imagen..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editImageInput.trim()) {
                          setEditMachineGallery(prev => [...prev, editImageInput.trim()]);
                          setEditImageInput("");
                        }
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>

                  {/* Selected Gallery Photos */}
                  {editMachineGallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {editMachineGallery.map((photoUrl, idx) => (
                        <div key={idx} className={`relative rounded-lg overflow-hidden border ${idx === 0 ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800'} h-20 bg-zinc-900 group`}>
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className={`absolute top-1 left-1 px-1 rounded text-[9px] font-mono ${idx === 0 ? 'bg-red-600 text-white' : 'bg-black/60 text-zinc-300'}`}>
                            {idx === 0 ? "Principal" : `#${idx+1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditMachineGallery(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-black/80 hover:bg-red-950 text-zinc-300 hover:text-red-400 p-1 rounded border border-zinc-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditMachineGallery(prev => {
                                  const arr = [...prev];
                                  const item = arr.splice(idx, 1)[0];
                                  arr.unshift(item);
                                  return arr;
                                });
                              }}
                              className="absolute bottom-1 inset-x-1 bg-black/80 hover:bg-zinc-700 text-white text-[9px] py-1 rounded text-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Hacer Principal
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Links section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block">Enlaces web / Tutoriales (Opcional)</label>
                <div className="bg-black border border-zinc-850 rounded-xl p-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editLinkInput}
                      onChange={(e) => setEditLinkInput(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editLinkInput.trim()) {
                          setEditMachineLinks(prev => [...prev, editLinkInput.trim()]);
                          setEditLinkInput("");
                        }
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>

                  {/* Added Links */}
                  {editMachineLinks.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {editMachineLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs">
                          <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate flex-1 block pr-2">
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => setEditMachineLinks(prev => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    if (editingMachine) {
                      handleDeleteMachine(editingMachine.id);
                    }
                  }}
                  className="px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Eliminar esta máquina del catálogo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingMachine(null)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR CÁRDIO ANTES DE AÑADIR */}
      {pendingCardioMachine && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-red-500/20">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Configurar Cardio
              </h3>
              <p className="text-xs text-zinc-400">
                {pendingCardioMachine.machine.name}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Tiempo (minutos)</label>
                <input
                  type="number"
                  min="1"
                  value={pendingCardioMachine.durationMinutes}
                  onChange={(e) => setPendingCardioMachine(prev => prev ? {...prev, durationMinutes: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0)} : null)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white text-lg font-black font-mono focus:outline-none focus:border-red-500 transition-colors text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Intensidad</label>
                <select
                  value={pendingCardioMachine.intensity}
                  onChange={(e) => setPendingCardioMachine(prev => prev ? {...prev, intensity: e.target.value} : null)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white text-lg font-black font-mono focus:outline-none focus:border-red-500 transition-colors appearance-none text-center"
                >
                  <option value="" disabled>Selecciona Nivel...</option>
                  {CARDIO_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setPendingCardioMachine(null);
                  setShowSelectMachineModal(true);
                }}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-800"
              >
                Volver
              </button>
              <button
                onClick={confirmAddCardioMachine}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SELECCIONAR MÁQUINA PARA AÑADIR A LA SESIÓN EN CURSO */}
      {showSelectMachineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-10 pb-24 overflow-y-auto min-h-screen">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">Seleccionar Ejercicio / Máquina</h3>
                <p className="text-xs text-zinc-400">Elige la máquina que vas a realizar ahora</p>
              </div>
              <button
                onClick={() => setShowSelectMachineModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar máquina..."
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => {
                  setShowSelectMachineModal(false);
                  setShowAddMachineModal(true);
                }}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Crear Nueva</span>
              </button>
            </div>

            {/* List of machines to click */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredMachines.map((machine) => {
                const isAlreadyInSession = activeExercises.some(e => e.machineId === machine.id);
                return (
                  <button
                    key={machine.id}
                    disabled={isAlreadyInSession}
                    onClick={() => addMachineToActiveSession(machine)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isAlreadyInSession 
                        ? "bg-black/50 border-zinc-800/40 opacity-50 cursor-not-allowed" 
                        : "bg-black border-zinc-850 hover:border-red-500 hover:bg-zinc-900/50"
                    }`}
                  >
                    <img 
                      src={machine.imageUrl || (machine.imageUrls && machine.imageUrls.find(u => !!u)) || PRESET_MACHINE_PHOTOS[0]} 
                      alt={machine.name} 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const validUrls = (machine.imageUrls || []).filter(u => !!u);
                        setZoomedGallery({
                          urls: validUrls.length > 0 ? validUrls : [machine.imageUrl || PRESET_MACHINE_PHOTOS[0]],
                          index: 0,
                          title: machine.name
                        });
                      }}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-zinc-800 cursor-pointer"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-black text-red-500 uppercase tracking-widest block">
                        {formatCategories(machine.category)}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">{machine.name}</h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{machine.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLAN: SELECCIONAR MÁQUINA PARA AÑADIR AL PLAN EN CURSO */}
      {showPlanMachineSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-10 pb-24 overflow-y-auto min-h-screen">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">Añadir al Plan</h3>
                <p className="text-xs text-zinc-400">Selecciona las máquinas para incluir en tu plan</p>
              </div>
              <button
                onClick={() => setShowPlanMachineSelector(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar máquina..."
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => {
                  setShowPlanMachineSelector(false);
                  setShowAddMachineModal(true);
                }}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Crear Nueva</span>
              </button>
            </div>

            {/* List of machines to click */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredMachines.map((machine) => {
                const isAlreadyInPlan = newPlanMachines.some(m => m.id === machine.id);
                return (
                  <button
                    key={machine.id}
                    disabled={isAlreadyInPlan}
                    onClick={() => {
                      setNewPlanMachines(prev => [...prev, machine]);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isAlreadyInPlan 
                        ? "bg-black/50 border-zinc-800/40 opacity-50 cursor-not-allowed" 
                        : "bg-black border-zinc-850 hover:border-red-500 hover:bg-zinc-900/50"
                    }`}
                  >
                    <img 
                      src={machine.imageUrl || (machine.imageUrls && machine.imageUrls.find(u => !!u)) || PRESET_MACHINE_PHOTOS[0]} 
                      alt={machine.name} 
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-zinc-800"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-black text-red-500 uppercase tracking-widest block">
                        {formatCategories(machine.category)}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">{machine.name}</h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{machine.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CELEBRACIÓN DE ENTRENAMIENTO COMPLETADO */}
      {completedSummary && (() => {
        const sessionFocus = calculateSessionMuscleFocus(completedSummary.exercises);
        const totalCompletedSets = completedSummary.exercises.reduce((acc, ex) => {
          return acc + (ex.sets?.filter(s => s.completed).length || ex.sets?.length || 0);
        }, 0);
        const totalCardioMinutes = completedSummary.exercises.reduce((acc, ex) => {
          return acc + (ex.cardio?.reduce((cAcc, c) => cAcc + (Number(c.durationMinutes) || 0), 0) || 0);
        }, 0);

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-red-500/30 rounded-3xl max-w-lg w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-300 max-h-[92vh] flex flex-col">
              
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-black text-red-500 tracking-wider uppercase bg-red-950/60 px-3 py-1 rounded-full border border-red-500/30">
                  ¡Entrenamiento Guardado!
                </span>
                <button 
                  onClick={() => {
                    setCompletedSummary(null);
                    setActiveSubTab("calendar");
                  }}
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
                  {sessionFocus.title}
                </h2>
                <p className="text-xs text-zinc-400">
                  {sessionFocus.subtitle}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {sessionFocus.primaryGroups.map((grp, gIdx) => {
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

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">Tiempo Total</span>
                  <span className="text-sm font-mono font-bold text-red-400">
                    {formatTime(completedSummary.durationSeconds)}
                  </span>
                </div>
                <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">Máquinas</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {completedSummary.exercises.length} ej.
                  </span>
                </div>
                <div className="bg-black p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">{totalCardioMinutes > 0 ? "Cardio / Series" : "Series Totales"}</span>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {totalCardioMinutes > 0 ? `${totalCardioMinutes}m • ${totalCompletedSets}s` : `${totalCompletedSets} series`}
                  </span>
                </div>
              </div>

              {/* List of Completed Machines with Muscle Badges */}
              <div className="flex-1 overflow-y-auto pr-1 text-left space-y-2 min-h-0 max-h-56">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                  <span>Máquinas Realizadas</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Grupo Muscular</span>
                </div>

                <div className="space-y-2">
                  {completedSummary.exercises.map((ex, idx) => {
                    const categories = getExerciseCategories(ex);
                    const totalSets = ex.sets?.filter(s => s.completed).length || ex.sets?.length || 0;
                    const maxWeight = ex.sets ? Math.max(...ex.sets.map(s => Number(s.weight) || 0), 0) : 0;
                    const cardioMins = ex.cardio?.reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0) || 0;

                    return (
                      <div 
                        key={idx} 
                        className="bg-black/70 border border-zinc-850 hover:border-zinc-700 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {ex.imageUrl ? (
                            <img 
                              src={ex.imageUrl} 
                              alt={ex.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" 
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                              <Dumbbell className="w-5 h-5" />
                            </div>
                          )}
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

                        <div className="text-right shrink-0">
                          {ex.isCardio ? (
                            <span className="text-[11px] font-mono text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 block">
                              ⏱ {cardioMins} min
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-mono font-bold text-zinc-200 block">
                                {totalSets} {totalSets === 1 ? "serie" : "series"}
                              </span>
                              {maxWeight > 0 && (
                                <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                                  Máx {maxWeight} kg
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setCompletedSummary(null);
                    setActiveSubTab("calendar");
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Ver en el Calendario</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULL-SCREEN ZOOM GALLERY OVERLAY */}
      {zoomedGallery && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={() => setZoomedGallery(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer z-[120] border border-zinc-700"
          >
            <X className="w-6 h-6" />
          </button>
          
          {zoomedGallery.title && (
            <div className="absolute top-20 sm:top-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-3xl px-4 sm:px-24 text-center pointer-events-none">
              <h3 className="text-base sm:text-2xl font-black text-white px-5 sm:px-6 py-2 bg-black/70 backdrop-blur-md rounded-full border border-zinc-800 shadow-xl truncate inline-block max-w-full pointer-events-auto">
                {zoomedGallery.title}
              </h3>
            </div>
          )}
          
          <div className="w-full max-w-5xl h-full p-4 sm:p-12 flex flex-col items-center justify-center relative">
            <img 
              src={zoomedGallery.urls[zoomedGallery.index] || PRESET_MACHINE_PHOTOS[0]} 
              alt="Zoomed" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            
            {zoomedGallery.urls.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedGallery(prev => prev ? { ...prev, index: prev.index === 0 ? prev.urls.length - 1 : prev.index - 1 } : null);
                  }}
                  className="absolute left-2 sm:left-12 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/60 hover:bg-red-600 text-white rounded-full cursor-pointer transition-all border border-zinc-700 hover:border-red-500 shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedGallery(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                  }}
                  className="absolute right-2 sm:right-12 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/60 hover:bg-red-600 text-white rounded-full cursor-pointer transition-all border border-zinc-700 hover:border-red-500 shadow-xl"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                
                <div className="absolute bottom-6 sm:bottom-12 flex gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md border border-zinc-800">
                  {zoomedGallery.urls.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setZoomedGallery(prev => prev ? { ...prev, index: idx } : null)}
                      className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === zoomedGallery.index 
                          ? 'bg-red-500 scale-125 shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                          : 'bg-zinc-600 hover:bg-zinc-400'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* OPTIONAL REST TIMER OVERLAY */}
      {showRestTimer && (
        <RestTimer
          key={restTimerKey}
          initialSeconds={restTimerSeconds}
          type={restTimerType}
          onClose={() => setShowRestTimer(false)}
          onTimeAdjusted={handleTimeAdjusted}
        />
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.action();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* DEDICATED FULL DETAIL MODAL FOR AN EXERCISE (MACHINE + DETAILED SETS) */}
      {selectedExerciseDetailModal && (() => {
        const { log, exercise: ex } = selectedExerciseDetailModal;
        const machineObj = machines.find(m => m.id === ex.machineId);
        const isCardio = Boolean(
          ex.isCardio || 
          isCardioCategory(ex.category) ||
          (ex.cardio && ex.cardio.length > 0)
        );

        const photoUrl = ex.imageUrl || (ex.imageUrls && ex.imageUrls[0]) || machineObj?.imageUrl || (machineObj?.imageUrls && machineObj?.imageUrls[0]) || PRESET_MACHINE_PHOTOS[0];
        const allPhotos = (ex.imageUrls && ex.imageUrls.length > 0) 
          ? ex.imageUrls 
          : (machineObj?.imageUrls && machineObj?.imageUrls.length > 0) 
            ? machineObj.imageUrls 
            : [photoUrl];

        const activeIdx = selectedExerciseDetailModal.activeImageIndex || 0;
        const currentPhoto = allPhotos[activeIdx] || photoUrl;

        const totalSets = (ex.sets || []).length;
        const completedSetsCount = (ex.sets || []).filter((s: any) => s.completed).length;
        const maxWeightLifted = (ex.sets || []).reduce((max: number, s: any) => Math.max(max, Number(s.weight) || 0), 0);
        const totalVolumeLifted = (ex.sets || []).reduce((acc: number, s: any) => acc + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0);
        const totalReps = (ex.sets || []).reduce((acc: number, s: any) => acc + (Number(s.reps) || 0), 0);
        const totalCardioMinutes = (ex.cardio || []).reduce((sum: number, c: any) => sum + (Number(c.durationMinutes) || 0), 0);

        return (
          <div 
            className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedExerciseDetailModal(null)}
          >
            <div 
              className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-2xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded">
                      Detalle de Ejercicio
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {formatSpanishDate(log.date)} • ⏱ {formatTime(log.durationSeconds)}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">{ex.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {formatCategories(ex.category || (isCardio ? "Cardio" : "Fuerza"))}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExerciseDetailModal(null)}
                  className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Machine Media & Description */}
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-850 bg-black max-h-64 sm:max-h-72 flex items-center justify-center group">
                  <img 
                    src={currentPhoto} 
                    alt={ex.name}
                    className="w-full h-56 sm:h-64 object-cover cursor-pointer"
                    onClick={() => setZoomedGallery({ urls: allPhotos, index: activeIdx, title: ex.name })}
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute("src", PRESET_MACHINE_PHOTOS[0]);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setZoomedGallery({ urls: allPhotos, index: activeIdx, title: ex.name })}
                    className="absolute bottom-3 right-3 bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-700 flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition-transform active:scale-95"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Ver en Grande</span>
                  </button>

                  {allPhotos.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExerciseDetailModal(prev => prev ? {
                            ...prev,
                            activeImageIndex: (activeIdx === 0 ? allPhotos.length - 1 : activeIdx - 1)
                          } : null);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/70 hover:bg-red-600 text-white rounded-full cursor-pointer transition-all border border-zinc-700 shadow-md"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExerciseDetailModal(prev => prev ? {
                            ...prev,
                            activeImageIndex: (activeIdx + 1) % allPhotos.length
                          } : null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/70 hover:bg-red-600 text-white rounded-full cursor-pointer transition-all border border-zinc-700 shadow-md"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Photo thumbnails if multiple */}
                {allPhotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allPhotos.map((p: string, pIdx: number) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setSelectedExerciseDetailModal(prev => prev ? { ...prev, activeImageIndex: pIdx } : null)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                          pIdx === activeIdx ? 'border-red-500 ring-2 ring-red-500/40 scale-105' : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={p} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Description & Guide */}
                {machineObj?.description && (
                  <div className="bg-zinc-900/80 border border-zinc-850 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                      Instrucciones / Guía de la máquina
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {machineObj.description}
                    </p>
                  </div>
                )}

                {/* Tutorial links */}
                {(ex.links || machineObj?.links || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(ex.links || machineObj?.links || []).map((link: string, lIdx: number) => (
                      <a
                        key={lIdx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/50 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Tutorial / Video #{lIdx + 1}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Breakdown of Sets or Cardio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-500" />
                    {isCardio ? "Bloques de Cardio Realizados" : "Series Realizadas en la Sesión"}
                  </span>
                  <span className="text-xs font-mono font-bold text-red-400">
                    {isCardio ? `${totalCardioMinutes} min totales` : `${completedSetsCount} / ${totalSets} completadas`}
                  </span>
                </div>

                {isCardio ? (
                  <div className="space-y-2">
                    {(ex.cardio || []).map((c: any, cIdx: number) => (
                      <div key={cIdx} className="bg-black border border-zinc-850 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-mono font-black flex items-center justify-center">
                            #{c.blockNumber || cIdx + 1}
                          </span>
                          <div>
                            <span className="text-base font-black text-white font-mono">
                              {c.durationMinutes} min
                            </span>
                            <span className="text-xs text-zinc-400 block font-mono">
                              Intensidad: <strong className="text-red-400">{c.intensity || 'Normal'}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                          {c.speedKmh !== undefined && (
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-800">
                              {c.speedKmh} km/h
                            </span>
                          )}
                          {c.inclinePct !== undefined && (
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-800">
                              {c.inclinePct}% incl.
                            </span>
                          )}
                          {c.distanceKm !== undefined && Number(c.distanceKm) > 0 && (
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-800">
                              {c.distanceKm} km
                            </span>
                          )}
                          {c.caloriesKcal !== undefined && Number(c.caloriesKcal) > 0 && (
                            <span className="bg-zinc-900 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-800">
                              {c.caloriesKcal} kcal
                            </span>
                          )}
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 p-1.5 rounded-full flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-3.5 py-2 text-[10px] font-mono text-zinc-500 uppercase font-bold bg-black/60 rounded-xl border border-zinc-900">
                      <div className="col-span-2">Serie</div>
                      <div className="col-span-3 text-center">Carga (kg)</div>
                      <div className="col-span-3 text-center">Repeticiones</div>
                      <div className="col-span-2 text-center">RIR</div>
                      <div className="col-span-2 text-right">Estado</div>
                    </div>

                    {(ex.sets || []).map((s: any, sIdx: number) => (
                      <div 
                        key={sIdx}
                        className="grid grid-cols-12 gap-2 items-center px-3.5 py-3 bg-black border border-zinc-850 rounded-xl text-xs font-mono"
                      >
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-zinc-900 text-zinc-200 font-bold flex items-center justify-center text-xs border border-zinc-800">
                            {s.setNumber || sIdx + 1}
                          </span>
                        </div>

                        <div className="col-span-3 text-center">
                          <span className="text-base font-black text-red-400">
                            {s.weight} <span className="text-xs font-normal text-zinc-500">kg</span>
                          </span>
                        </div>

                        <div className="col-span-3 text-center">
                          <span className="text-sm font-bold text-white">
                            {s.reps} <span className="text-xs font-normal text-zinc-500">reps</span>
                          </span>
                        </div>

                        <div className="col-span-2 text-center">
                          {s.rir !== undefined && s.rir !== "" ? (
                            <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              {s.rir.startsWith("RIR") ? s.rir : `RIR ${s.rir}`}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">-</span>
                          )}
                        </div>

                        <div className="col-span-2 text-right flex justify-end">
                          {s.completed ? (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 p-1.5 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Global Summary for this exercise */}
              {!isCardio && totalSets > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-black p-3 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Volumen Total</span>
                    <span className="text-sm font-mono font-black text-red-400">{totalVolumeLifted.toLocaleString()} kg</span>
                  </div>
                  <div className="bg-black p-3 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Carga Máxima</span>
                    <span className="text-sm font-mono font-black text-white">{maxWeightLifted} kg</span>
                  </div>
                  <div className="bg-black p-3 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Total Reps</span>
                    <span className="text-sm font-mono font-black text-zinc-300">{totalReps}</span>
                  </div>
                  <div className="bg-black p-3 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Completadas</span>
                    <span className="text-sm font-mono font-black text-emerald-400">{completedSetsCount} / {totalSets}</span>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExerciseDetailModal(null)}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border border-zinc-800"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
