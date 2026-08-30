/**
 * Types for AI Strength Training Application
 */

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  suggestedWeight: string;
  techniqueInstructions: string;
  animationType: 'squat' | 'bench_press' | 'deadlift' | 'bicep_curl' | 'shoulder_press' | 'push_up' | 'pull_up' | 'lunge' | 'generic';
}

export interface Day {
  dayNumber: number;
  dayName: string;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  routineName: string;
  description: string;
  days: Day[];
  createdAt: string;
}

export interface ExerciseSetLog {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  rir?: string;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO String (YYYY-MM-DD)
  routineId: string;
  dayNumber: number;
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSetLog[];
}

export interface BodyMetricLog {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  chest?: number; // in cm
  waist?: number; // in cm
  arms?: number; // in cm
  legs?: number; // in cm
}

export interface DailyMacro {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSuggestion {
  meal: string;
  suggestion: string;
  macros: string;
}

export interface NutritionAdvice {
  macros: DailyMacro;
  tips: string[];
  mealPlan: MealSuggestion[];
}

export interface UserProfile {
  age: number;
  weight: number; // in kg
  height: number; // in cm
  gender: string;
  objective: string; // "fuerza" | "hipertrofia" | "resistencia" | "perdida_grasa"
  fitnessLevel: string; // "principiante" | "intermedio" | "avanzado"
  daysPerWeek: number;
}

export interface MachineExercise {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // Used as the primary/thumbnail image
  imageUrls?: string[]; // Multiple images for gallery
  links?: string[]; // Links to web pages/tutorials
  category: string | string[]; // e.g., "Cardio", "Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core", "Personalizados"
  isCustom?: boolean;
  isCardio?: boolean;
}

export interface FreeExerciseSet {
  setNumber: number;
  reps: number;
  weight: number; // in kg
  completed: boolean;
  rir?: string;
}

export interface CardioBlock {
  blockNumber: number;
  durationMinutes: number; // in minutes
  intensity: string; // e.g. "Nivel 6", "Moderada", "Alta", "10 km/h", "Inclinación 5%"
  distanceKm?: number; // optional in km
  caloriesKcal?: number; // optional kcal
  speedKmh?: number; // optional km/h
  inclinePct?: number; // optional %
  completed: boolean;
}

export interface ActiveFreeExercise {
  machineId: string;
  name: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  links?: string[];
  category?: string | string[];
  isCardio?: boolean;
  sets: FreeExerciseSet[];
  cardio?: CardioBlock[];
  notes?: string;
}

export interface FreeWorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string or format
  endTime: string;
  durationSeconds: number;
  exercises: {
    machineId: string;
    name: string;
    imageUrl: string;
    imageUrls?: string[];
    links?: string[];
    category?: string | string[];
    isCardio?: boolean;
    sets?: FreeExerciseSet[];
    cardio?: CardioBlock[];
    notes?: string;
  }[];
  notes?: string;
}

export interface SavedWorkoutPlan {
  id: string;
  name: string;
  exercises: {
    machineId: string;
    name: string;
    imageUrl: string;
    isCardio?: boolean;
    category?: string | string[];
  }[];
  createdAt: string;
}

export interface ExerciseLastPerformance {
  machineId: string;
  date: string;
  isCardio?: boolean;
  sets?: FreeExerciseSet[];
  cardio?: CardioBlock[];
  maxWeight?: number;
  totalCardioMinutes?: number;
  lastIntensity?: string;
  notes?: string;
}

