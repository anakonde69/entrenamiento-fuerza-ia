import customLogo from "./assets/images/custom-logo.jpg";
import { useState, useEffect } from "react";
import { 
  Dumbbell, Activity, Scale, Apple, RefreshCw, 
  Sparkles, Settings, LogOut, CheckCircle2, Flame, LogIn, Calendar, Edit2 
} from "lucide-react";
import { UserProfile, Routine, NutritionAdvice, WorkoutLog, BodyMetricLog, FreeWorkoutLog } from "./types";
import AIPromptScreen from "./components/AIPromptScreen";
import WorkoutDashboard from "./components/WorkoutDashboard";
import ProgressStats from "./components/ProgressStats";
import BodyMetricsTracker from "./components/BodyMetricsTracker";
import NutritionAdvisor from "./components/NutritionAdvisor";
import HealthSync from "./components/HealthSync";
import FreeWorkout from "./components/FreeWorkout";
import ConfirmModal from "./components/ConfirmModal";
import { auth, db, signInWithGoogle, signOut, handleRedirectResult, handleFirestoreError, OperationType, cleanForFirestore } from "./lib/firebase";
import { safeSetItem, safeGetItem } from "./lib/storage";
import { User } from "firebase/auth";
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = safeGetItem("user_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [routine, setRoutine] = useState<Routine | null>(() => {
    try {
      const saved = safeGetItem("user_routine");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [nutrition, setNutrition] = useState<NutritionAdvice | null>(() => {
    try {
      const saved = safeGetItem("user_nutrition");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = safeGetItem("workout_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricLog[]>(() => {
    try {
      const saved = safeGetItem("body_metrics");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<string>("freeworkout");
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  // Handle Firebase Auth
  useEffect(() => {
    // Procesa el resultado de la redirección de Google (al volver de la pestaña).
    handleRedirectResult();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore for User Profile, Routine, Nutrition, Logs, and Body Metrics
  useEffect(() => {
    if (!user) return;

    // 1. Sync User Profile, Routine and Nutrition from Firestore
    const userDocRef = doc(db, "userProfiles", user.uid);
    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile) {
          setProfile(data.profile);
          safeSetItem("user_profile", JSON.stringify(data.profile));
        }
        if (data.routine) {
          setRoutine(data.routine);
          safeSetItem("user_routine", JSON.stringify(data.routine));
        }
        if (data.nutrition) {
          setNutrition(data.nutrition);
          safeSetItem("user_nutrition", JSON.stringify(data.nutrition));
        }
      } else {
        // If not yet in Firestore, check if we have cached data in localStorage to migrate
        const savedProfile = safeGetItem("user_profile");
        const savedRoutine = safeGetItem("user_routine");
        const savedNutrition = safeGetItem("user_nutrition");
        if (savedProfile && savedRoutine && savedNutrition) {
          try {
            const p = JSON.parse(savedProfile);
            const r = JSON.parse(savedRoutine);
            const n = JSON.parse(savedNutrition);
            setDoc(userDocRef, {
              userId: user.uid,
              profile: p,
              routine: r,
              nutrition: n,
              updatedAt: Date.now()
            }).catch(err => console.error("Error migrating profile to Firestore:", err));
          } catch (e) {
            console.error("Parse error during profile migration:", e);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `userProfiles/${user.uid}`);
    });

    // 2. Sync Routine & Free Workout Logs from Firestore
    const logsQuery = query(collection(db, "workoutLogs"), where("userId", "==", user.uid));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logs: WorkoutLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.routineId || data.exerciseId) {
          logs.push({
            id: docSnap.id,
            date: data.date,
            routineId: data.routineId || "routine_custom",
            dayNumber: data.dayNumber || 1,
            exerciseId: data.exerciseId || docSnap.id,
            exerciseName: data.exerciseName || "Ejercicio",
            sets: data.sets || []
          });
        } else if (Array.isArray(data.exercises) && data.exercises.length > 0) {
          // Free Workout log with multiple exercises - expand for stats tracking
          data.exercises.forEach((ex: any, idx: number) => {
            logs.push({
              id: `${docSnap.id}_${ex.machineId || idx}`,
              date: data.date,
              routineId: "free_workout",
              dayNumber: 0,
              exerciseId: ex.machineId || `free_ex_${idx}`,
              exerciseName: ex.name || "Ejercicio Libre",
              sets: (ex.sets || []).map((s: any) => ({
                setNumber: s.setNumber || 1,
                reps: s.reps || 0,
                weight: s.weight || 0,
                completed: Boolean(s.completed)
              }))
            });
          });
        }
      });
      if (logs.length > 0) {
        const sorted = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWorkoutLogs(sorted);
        safeSetItem("workout_logs", JSON.stringify(sorted));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "workoutLogs");
    });

    // 3. Sync Body Metrics from Firestore
    const metricsQuery = query(collection(db, "bodyMetrics"), where("userId", "==", user.uid));
    const unsubscribeMetrics = onSnapshot(metricsQuery, (snapshot) => {
      const metrics: BodyMetricLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        metrics.push({
          id: docSnap.id,
          date: data.date,
          weight: data.weight,
          chest: data.chest,
          waist: data.waist,
          arms: data.arms,
          legs: data.legs
        });
      });
      if (metrics.length > 0) {
        const sorted = metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBodyMetrics(sorted);
        safeSetItem("body_metrics", JSON.stringify(sorted));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "bodyMetrics");
    });

    return () => {
      unsubscribeProfile();
      unsubscribeLogs();
      unsubscribeMetrics();
    };
  }, [user]);

  // Save changes to Firestore and localStorage
  const handleFreeWorkoutLogSaved = (freeLog: FreeWorkoutLog) => {
    // Persistence is handled directly in FreeWorkout component via Firestore.
    // The onSnapshot listener in App.tsx will automatically pick up the new FreeWorkoutLog
    // and expand it into individual WorkoutLogs for the progress stats.
  };

  const handleAddWorkoutLog = async (newLog: WorkoutLog) => {
    const updated = [newLog, ...workoutLogs];
    setWorkoutLogs(updated);
    safeSetItem("workout_logs", JSON.stringify(updated));

    if (user) {
      try {
        await setDoc(doc(db, "workoutLogs", newLog.id), cleanForFirestore({
          ...newLog,
          durationSeconds: 0,
          userId: user.uid,
          createdAt: Date.now()
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `workoutLogs/${newLog.id}`);
      }
    }
  };

  const handleAddBodyMetric = async (newMetric: BodyMetricLog) => {
    const updated = [newMetric, ...bodyMetrics];
    setBodyMetrics(updated);
    safeSetItem("body_metrics", JSON.stringify(updated));

    if (user) {
      try {
        await setDoc(doc(db, "bodyMetrics", newMetric.id), cleanForFirestore({
          ...newMetric,
          userId: user.uid,
          createdAt: Date.now()
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `bodyMetrics/${newMetric.id}`);
      }
    }
  };

  const handleDeleteBodyMetric = async (id: string) => {
    const updated = bodyMetrics.filter((m) => m.id !== id);
    setBodyMetrics(updated);
    safeSetItem("body_metrics", JSON.stringify(updated));

    if (user) {
      try {
        await deleteDoc(doc(db, "bodyMetrics", id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `bodyMetrics/${id}`);
      }
    }
  };

  const handleGenerationComplete = async (
    userProfile: UserProfile, 
    generatedRoutine: Routine, 
    generatedNutrition: NutritionAdvice
  ) => {
    setProfile(userProfile);
    setRoutine(generatedRoutine);
    setNutrition(generatedNutrition);

    safeSetItem("user_profile", JSON.stringify(userProfile));
    safeSetItem("user_routine", JSON.stringify(generatedRoutine));
    safeSetItem("user_nutrition", JSON.stringify(generatedNutrition));

    if (user) {
      try {
        await setDoc(doc(db, "userProfiles", user.uid), cleanForFirestore({
          userId: user.uid,
          profile: userProfile,
          routine: generatedRoutine,
          nutrition: generatedNutrition,
          updatedAt: Date.now()
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `userProfiles/${user.uid}`);
      }
    }

    // Seed initial body weight metric
    const initialMetric: BodyMetricLog = {
      id: "metric_" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      weight: userProfile.weight,
    };
    const updatedMetrics = [initialMetric, ...bodyMetrics];
    setBodyMetrics(updatedMetrics);
    safeSetItem("body_metrics", JSON.stringify(updatedMetrics));

    if (user) {
      try {
        await setDoc(doc(db, "bodyMetrics", initialMetric.id), cleanForFirestore({
          ...initialMetric,
          userId: user.uid,
          createdAt: Date.now()
        }));
      } catch (e) {
        console.error("Error saving initial metric to Firestore:", e);
      }
    }

    setActiveTab("workout");
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Recalculate macros based on current profile
  const handleRefreshNutrition = async () => {
    if (!profile) return;
    try {
      const res = await fetch("/api/nutrition-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        setNutrition(data);
        safeSetItem("user_nutrition", JSON.stringify(data));
        if (user) {
          await setDoc(doc(db, "userProfiles", user.uid), cleanForFirestore({
            nutrition: data,
            updatedAt: Date.now()
          }), { merge: true });
        }
        alert("Plan de macronutrientes recalculado correctamente con la IA.");
      }
    } catch (e) {
      console.error(e);
      alert("No se pudieron recalcular los macronutrientes.");
    }
  };

  const handleResetApp = () => {
    setConfirmDialog({
      message: "¿Estás seguro de que deseas restablecer la aplicación? Se borrará tu rutina, tus estadísticas de progreso y tu perfil.",
      action: async () => {
        localStorage.clear();
        setProfile(null);
        setRoutine(null);
        setNutrition(null);
        setWorkoutLogs([]);
        setBodyMetrics([]);
        setActiveTab("workout");
        if (user) {
          try {
            await deleteDoc(doc(db, "userProfiles", user.uid));
          } catch (e) {
            console.error("Error resetting userProfile:", e);
          }
        }
      }
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-zinc-300 font-sans">
        <Dumbbell className="w-10 h-10 text-red-600 animate-pulse mb-4" />
        <p className="text-sm font-mono tracking-widest text-zinc-500">CARGANDO...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-zinc-300 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="flex justify-center mb-4">
              <img src={customLogo} alt="Panatta Sport" className="h-24 object-contain drop-shadow-xl" />
            </h1>
            <p className="text-zinc-400 text-sm">Inicia sesión para registrar tus entrenamientos por separado.</p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-black py-4 px-6 rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-600/10 active:scale-95 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continuar con Google</span>
          </button>
        </div>
      </div>
    );
  }

  // If no routine is configured, guide the user through the AI creation flow
  if (!profile || !routine || !nutrition) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 transition-colors duration-300">
        <AIPromptScreen onGenerationComplete={handleGenerationComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 transition-colors duration-300 pb-20 flex flex-col justify-between selection:bg-red-600 selection:text-white">
      
      <ConfirmModal
        isOpen={confirmDialog !== null}
        message={confirmDialog?.message || ""}
        onConfirm={() => confirmDialog?.action()}
        onCancel={() => setConfirmDialog(null)}
      />

      <div>
        {/* Premium Header Nav - Panatta Red & Black */}
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-red-950/60 h-16 flex items-center shrink-0">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <img src={customLogo} alt="Panatta Sport" className="h-10 sm:h-12 object-contain" />
              </div>

              {/* Desktop Tabs Navigation */}
              <nav className="hidden md:flex items-center gap-1 bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
                {[
                  { id: "freeworkout", label: "Entreno Libre", icon: Flame },
                  { id: "workout", label: "Rutina", icon: Dumbbell },
                  { id: "calendar", label: "Calendario", icon: Calendar },
                  { id: "plan", label: "Planificar", icon: Edit2 },
                  { id: "stats", label: "Progreso", icon: Activity },
                  { id: "metrics", label: "Medidas", icon: Scale },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-zinc-900 text-red-500 border border-red-600/40 shadow-md shadow-red-600/10"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Configuration / Logout */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Objetivo</p>
                  <p className="text-xs font-bold text-zinc-300">
                    {profile.objective === "fuerza" ? "Fuerza Máxima" :
                     profile.objective === "hipertrofia" ? "Hipertrofia" :
                     profile.objective === "resistencia" ? "Resistencia" : "Pérdida Grasa"}
                  </p>
                </div>
                <button
                  onClick={handleResetApp}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer border border-transparent hover:border-red-900/50"
                  title="Restablecer Aplicación / Nueva Rutina"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer border border-transparent hover:border-red-900/50"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-red-950/60 py-1.5 px-1.5 flex justify-between items-center z-50 shadow-2xl">
          {[
            { id: "freeworkout", label: "Libre", icon: Flame },
            { id: "workout", label: "Rutina", icon: Dumbbell },
            { id: "calendar", label: "Calendario", icon: Calendar },
            { id: "plan", label: "Plan", icon: Edit2 },
            { id: "stats", label: "Progreso", icon: Activity },
            { id: "metrics", label: "Medidas", icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 px-0.5 transition-all text-center cursor-pointer min-w-0 ${
                  isSelected
                    ? "text-red-500 font-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[8px] tracking-tight truncate w-full block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Primary Page Layout router */}
        <main className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(activeTab === "freeworkout" || activeTab === "calendar" || activeTab === "plan") && (
            <FreeWorkout 
              user={user}
              activeTopTab={activeTab as "freeworkout" | "calendar" | "plan"}
              onLogSaved={handleFreeWorkoutLogSaved}
            />
          )}

          {activeTab === "workout" && (
            <WorkoutDashboard 
              routine={routine} 
              onLogSaved={handleAddWorkoutLog} 
              onResetRoutine={handleResetApp}
              workoutLogs={workoutLogs}
            />
          )}
          
          {activeTab === "stats" && (
            <ProgressStats 
              workoutLogs={workoutLogs} 
              bodyMetrics={bodyMetrics} 
            />
          )}

          {activeTab === "metrics" && (
            <BodyMetricsTracker 
              metrics={bodyMetrics} 
              onAddMetric={handleAddBodyMetric} 
              onDeleteMetric={handleDeleteBodyMetric} 
            />
          )}

          {activeTab === "nutrition" && (
            <NutritionAdvisor 
              advice={nutrition} 
              profile={profile} 
              onRefreshAdvice={handleRefreshNutrition} 
            />
          )}

          {activeTab === "sync" && (
            <HealthSync />
          )}
        </main>
      </div>

      {/* Status Bar Footer */}
      <footer className="mt-12 h-10 bg-black border-t border-zinc-900 px-6 flex items-center justify-between text-[10px] text-zinc-500 shrink-0 font-mono">
        <div className="flex gap-4">
          <span>LATENCIA: 14ms</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>PANATTA CORE: ACTIVE</span>
        </div>
        <div>
          TOTAL ENTRENAMIENTOS: {workoutLogs.length}
        </div>
        <div>
          STATUS: ONLINE
        </div>
      </footer>

    </div>
  );
}
