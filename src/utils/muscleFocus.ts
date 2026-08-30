/**
 * Utility to identify muscle groups and calculate session muscle focus
 * (e.g. "Sesión de Brazos y Pecho", "Sesión de Piernas y Espalda")
 */

export interface MuscleCategoryInfo {
  name: string;
  badgeClass: string;
  dotClass: string;
  iconName?: string;
}

export const MUSCLE_CATEGORIES: { [key: string]: MuscleCategoryInfo } = {
  Pecho: {
    name: "Pecho",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-400",
  },
  Espalda: {
    name: "Espalda",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    dotClass: "bg-indigo-400",
  },
  Piernas: {
    name: "Piernas",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  Bíceps: {
    name: "Bíceps",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  Tríceps: {
    name: "Tríceps",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    dotClass: "bg-orange-400",
  },
  Hombros: {
    name: "Hombros",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    dotClass: "bg-purple-400",
  },
  Cardio: {
    name: "Cardio",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    dotClass: "bg-rose-400",
  },
  Core: {
    name: "Core / Abdomen",
    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    dotClass: "bg-yellow-400",
  },
  Glúteos: {
    name: "Glúteos",
    badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    dotClass: "bg-teal-400",
  },
  General: {
    name: "Fuerza General",
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dotClass: "bg-zinc-400",
  },
};

/**
 * Normalizes a category string or matches an exercise name to standard muscle categories.
 */
export function getExerciseCategories(exercise: {
  name?: string;
  category?: string | string[];
  isCardio?: boolean;
}): string[] {
  const result = new Set<string>();

  if (exercise.isCardio) {
    result.add("Cardio");
  }

  // 1. Check explicit categories if present
  if (exercise.category) {
    const rawCategories = Array.isArray(exercise.category)
      ? exercise.category
      : [exercise.category];

    for (const cat of rawCategories) {
      if (!cat) continue;
      const lower = cat.toLowerCase().trim();
      if (lower.includes("cardio")) result.add("Cardio");
      else if (lower.includes("pecho") || lower.includes("chest") || lower.includes("pectoral")) result.add("Pecho");
      else if (lower.includes("espalda") || lower.includes("back") || lower.includes("dorsal")) result.add("Espalda");
      else if (lower.includes("pierna") || lower.includes("leg") || lower.includes("cuadricep") || lower.includes("femoral")) result.add("Piernas");
      else if (lower.includes("bicep") || lower.includes("bícep") || lower.includes("curl") || lower.includes("brazo") || lower.includes("arm") || lower.includes("antebrazo")) result.add("Bíceps");
      else if (lower.includes("tricep") || lower.includes("trícep") || lower.includes("extension de codo")) result.add("Tríceps");
      else if (lower.includes("hombro") || lower.includes("shoulder") || lower.includes("deltoid")) result.add("Hombros");
      else if (lower.includes("glute") || lower.includes("glúteo")) result.add("Piernas");
      else if (lower.includes("core") || lower.includes("abdom") || lower.includes("abs")) result.add("Core");
      else if (cat.trim().length > 0 && lower !== "personalizados" && lower !== "personalizado" && lower !== "fuerza") {
        result.add(cat.trim());
      }
    }
  }

  // 2. Fallback or augment with name-based keyword detection
  if (exercise.name) {
    const nameLower = exercise.name.toLowerCase();

    // Pecho
    if (
      nameLower.includes("pecho") ||
      nameLower.includes("banca") ||
      nameLower.includes("bench") ||
      nameLower.includes("pec deck") ||
      nameLower.includes("contractor") ||
      nameLower.includes("apertura") ||
      nameLower.includes("cruce de poleas") ||
      nameLower.includes("flexion") ||
      nameLower.includes("push up") ||
      nameLower.includes("chest") ||
      nameLower.includes("press inclinado") ||
      nameLower.includes("press declinado")
    ) {
      result.add("Pecho");
    }

    // Espalda
    if (
      nameLower.includes("espalda") ||
      nameLower.includes("dorsal") ||
      nameLower.includes("jalon") ||
      nameLower.includes("jalón") ||
      nameLower.includes("pulldown") ||
      nameLower.includes("dominada") ||
      nameLower.includes("pull up") ||
      nameLower.includes("chin up") ||
      nameLower.includes("remo") ||
      nameLower.includes("row") ||
      nameLower.includes("peso muerto") ||
      nameLower.includes("deadlift") ||
      nameLower.includes("face pull") ||
      nameLower.includes("t-bar")
    ) {
      result.add("Espalda");
    }

    // Piernas
    if (
      nameLower.includes("pierna") ||
      nameLower.includes("cuadriceps") ||
      nameLower.includes("cuádriceps") ||
      nameLower.includes("femoral") ||
      nameLower.includes("isquiotibiales") ||
      nameLower.includes("sentadilla") ||
      nameLower.includes("squat") ||
      nameLower.includes("prensa") ||
      nameLower.includes("leg press") ||
      nameLower.includes("extensiones") ||
      nameLower.includes("extension de rodilla") ||
      nameLower.includes("lunge") ||
      nameLower.includes("zancada") ||
      nameLower.includes("hip thrust") ||
      nameLower.includes("glute") ||
      nameLower.includes("gemelos") ||
      nameLower.includes("pantorrilla") ||
      nameLower.includes("hack") ||
      nameLower.includes("abductor") ||
      nameLower.includes("aductor")
    ) {
      result.add("Piernas");
    }

    // Bíceps
    if (
      nameLower.includes("bicep") ||
      nameLower.includes("bícep") ||
      nameLower.includes("curl") ||
      nameLower.includes("scott") ||
      nameLower.includes("predicador") ||
      nameLower.includes("martillo") ||
      nameLower.includes("antebrazo")
    ) {
      result.add("Bíceps");
    }

    // Tríceps
    if (
      nameLower.includes("tricep") ||
      nameLower.includes("trícep") ||
      nameLower.includes("polea triceps") ||
      nameLower.includes("fondos") ||
      nameLower.includes("dips") ||
      nameLower.includes("rompecraneos")
    ) {
      result.add("Tríceps");
    }

    // Hombros
    if (
      nameLower.includes("hombro") ||
      nameLower.includes("deltoides") ||
      nameLower.includes("shoulder") ||
      nameLower.includes("militar") ||
      nameLower.includes("military") ||
      nameLower.includes("elevacion lateral") ||
      nameLower.includes("elevaciones laterales") ||
      nameLower.includes("elevacion frontal") ||
      nameLower.includes("pajaros") ||
      nameLower.includes("pájaros") ||
      nameLower.includes("arnold") ||
      nameLower.includes("press hombro")
    ) {
      result.add("Hombros");
    }

    // Core
    if (
      nameLower.includes("abdom") ||
      nameLower.includes("core") ||
      nameLower.includes("crunch") ||
      nameLower.includes("plancha") ||
      nameLower.includes("plank") ||
      nameLower.includes("oblicuo") ||
      nameLower.includes("rueda abdominal") ||
      nameLower.includes("elevacion de piernas")
    ) {
      result.add("Core");
    }

    // Cardio
    if (
      nameLower.includes("cinta") ||
      nameLower.includes("correr") ||
      nameLower.includes("treadmill") ||
      nameLower.includes("bici") ||
      nameLower.includes("spinning") ||
      nameLower.includes("eliptica") ||
      nameLower.includes("elíptica") ||
      nameLower.includes("escaladora") ||
      nameLower.includes("stairmaster") ||
      nameLower.includes("cardio") ||
      nameLower.includes("hiit") ||
      nameLower.includes("remo indoor")
    ) {
      result.add("Cardio");
    }
  }

  const list = Array.from(result);
  return list.length > 0 ? list : ["General"];
}

/**
 * Calculates the overall session focus title based on the exercises completed.
 * Examples: "Sesión de Brazos y Pecho", "Sesión de Piernas y Espalda", "Sesión de Cardio y Piernas", etc.
 */
export function calculateSessionMuscleFocus(
  exercises: {
    name?: string;
    category?: string | string[];
    isCardio?: boolean;
  }[]
): {
  title: string;
  subtitle: string;
  primaryGroups: string[];
  breakdown: { [group: string]: number };
} {
  if (!exercises || exercises.length === 0) {
    return {
      title: "Sesión de Entrenamiento",
      subtitle: "Entrenamiento completado",
      primaryGroups: ["General"],
      breakdown: {},
    };
  }

  const breakdown: { [group: string]: number } = {};

  exercises.forEach((ex) => {
    const cats = getExerciseCategories(ex);
    cats.forEach((cat) => {
      breakdown[cat] = (breakdown[cat] || 0) + 1;
    });
  });

  // Sort groups by frequency
  const sortedGroups = Object.entries(breakdown)
    .filter(([grp]) => grp !== "General" && grp !== "Personalizados")
    .sort((a, b) => b[1] - a[1])
    .map(([grp]) => grp);

  if (sortedGroups.length === 0) {
    return {
      title: "Sesión de Fuerza General",
      subtitle: "Entrenamiento de acondicionamiento físico",
      primaryGroups: ["General"],
      breakdown,
    };
  }

  // 1 dominant muscle group
  if (sortedGroups.length === 1) {
    const main = sortedGroups[0];
    return {
      title: `Sesión de ${main}`,
      subtitle: `Enfoque principal en ${main.toLowerCase()}`,
      primaryGroups: [main],
      breakdown,
    };
  }

  // 2 muscle groups (e.g. "Brazos y Pecho", "Piernas y Espalda")
  if (sortedGroups.length === 2) {
    const [first, second] = sortedGroups;
    return {
      title: `Sesión de ${first} y ${second}`,
      subtitle: `Combinación de trabajo muscular para ${first.toLowerCase()} y ${second.toLowerCase()}`,
      primaryGroups: [first, second],
      breakdown,
    };
  }

  // 3 muscle groups (e.g. "Pecho, Hombros y Tríceps" or "Piernas, Espalda y Brazos")
  if (sortedGroups.length === 3) {
    const [first, second, third] = sortedGroups;
    return {
      title: `Sesión de ${first}, ${second} y ${third}`,
      subtitle: `Entrenamiento combinado de ${first.toLowerCase()}, ${second.toLowerCase()} y ${third.toLowerCase()}`,
      primaryGroups: [first, second, third],
      breakdown,
    };
  }

  // 4 or more muscle groups -> Full Body
  const topTwo = sortedGroups.slice(0, 2).join(" y ");
  return {
    title: "Sesión de Cuerpo Completo (Full Body)",
    subtitle: `Trabajo integral con énfasis en ${topTwo.toLowerCase()}`,
    primaryGroups: sortedGroups.slice(0, 3),
    breakdown,
  };
}

/**
 * Returns the CSS styling badge for a given muscle category.
 */
export function getCategoryBadge(categoryName: string): MuscleCategoryInfo {
  const clean = categoryName.trim();
  if (MUSCLE_CATEGORIES[clean]) {
    return MUSCLE_CATEGORIES[clean];
  }
  // Case-insensitive match
  for (const [key, val] of Object.entries(MUSCLE_CATEGORIES)) {
    if (key.toLowerCase() === clean.toLowerCase()) {
      return val;
    }
  }
  return {
    name: clean,
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dotClass: "bg-zinc-400",
  };
}
