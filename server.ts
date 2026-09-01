import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Compact Fallback Routine Generator (in case Gemini is unavailable or rate-limited)
function getFallbackRoutine(age: any, weight: any, height: any, gender: any, objective: any, fitnessLevel: any, daysPerWeek: any) {
  const levelText = fitnessLevel === "principiante" ? "Principiante" : fitnessLevel === "intermedio" ? "Intermedio" : "Avanzado";
  const names: Record<string, string> = {
    fuerza: "Ruta de Fuerza Máxima",
    hipertrofia: "Hipertrofia y Desarrollo Muscular",
    resistencia: "Acondicionamiento y Resistencia Muscular",
    perdida_grasa: "Déficit y Tonificación Corporal"
  };
  const routineName = `${names[objective] || "Entrenamiento Personalizado"} (${levelText})`;
  const description = `Rutina estructurada de alto rendimiento adaptada para tu perfil físico de ${weight} kg y nivel ${levelText}. (Generada mediante motor de contingencia local debido a alta demanda en los servidores de IA)`;

  const exercisePool = [
    { id: "m_prensa_leg", name: "Prensa de Piernas (Leg Press)", animationType: "squat", instructions: "Controla la bajada y empuja con toda la planta del pie.", sets: 4, reps: "10-12", weight: "Moderado-Pesado" },
    { id: "m_jalon_polea", name: "Jalón al Pecho en Polea", animationType: "pull_up", instructions: "Lleva la barra al pecho juntando las escápulas.", sets: 4, reps: "10-12", weight: "RPE 8" },
    { id: "m_pec_deck", name: "Contractor de Pecho (Pec Deck)", animationType: "bench_press", instructions: "Mantén el pecho alto y junta los brazos controladamente.", sets: 3, reps: "12", weight: "Moderado" },
    { id: "m_curl_scott", name: "Curl Bíceps Banco Scott", animationType: "bicep_curl", instructions: "Mantén axilas apoyadas y flexiona sin usar inercia.", sets: 3, reps: "12", weight: "Moderado" },
    { id: "m_press_hombros", name: "Press de Hombros en Máquina", animationType: "shoulder_press", instructions: "Empuja hacia arriba y controla el peso en la bajada.", sets: 3, reps: "10", weight: "RPE 7.5" },
    { id: "m_extension_triceps", name: "Polea Alta para Tríceps", animationType: "push_up", instructions: "Fija los codos a las costillas y extiende el brazo completo.", sets: 3, reps: "12-15", weight: "Moderado" },
    { id: "m_curl_femoral", name: "Curl Femoral Tumbado", animationType: "deadlift", instructions: "Mantén la cadera pegada al banco y flexiona fuerte.", sets: 3, reps: "10-12", weight: "Moderado" },
    { id: "m_extension_cuadriceps", name: "Extensiones de Cuádriceps", animationType: "lunge", instructions: "Sube explosivo y aguanta 1 segundo arriba.", sets: 3, reps: "12-15", weight: "Moderado" }
  ];

  const days = [];
  const validDays = Math.min(Math.max(Number(daysPerWeek) || 3, 1), 7);
  const dayLabels: Record<number, string[]> = {
    1: ["Día Único: Full Body Eficiente"],
    2: ["Día 1: Torso (Empuje/Tirón)", "Día 2: Pierna y Core"],
    3: ["Día 1: Empuje (Torso)", "Día 2: Tirón (Espalda/Bíceps)", "Día 3: Piernas y Core"],
    4: ["Día 1: Empuje Fuerza", "Día 2: Piernas Fuerza", "Día 3: Tirón Hipertrofia", "Día 4: Core y Cardio"],
    5: ["Día 1: Pecho/Tríceps", "Día 2: Espalda/Bíceps", "Día 3: Piernas", "Día 4: Hombro/Core", "Día 5: Acondicionamiento"],
    6: ["Día 1: Empuje", "Día 2: Tirón", "Día 3: Piernas", "Día 4: Torso", "Día 5: Piernas Volumen", "Día 6: Hombros/Brazos"],
    7: ["Día 1: Lunes Empuje", "Día 2: Martes Tirón", "Día 3: Miércoles Pierna", "Día 4: Jueves Torso", "Día 5: Viernes Pierna", "Día 6: Sábado Brazos", "Día 7: Domingo Zona Media"]
  };
  const selectedLabels = dayLabels[validDays] || Array.from({ length: validDays }, (_, i) => `Día ${i + 1}: Sesión de Entrenamiento`);

  for (let i = 0; i < validDays; i++) {
    const exercises = [];
    for (let k = 0; k < 4; k++) {
      const idx = (i * 2 + k) % exercisePool.length;
      const ex = exercisePool[idx];
      exercises.push({
        id: `${ex.id}_d${i + 1}_${k}`,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        suggestedWeight: ex.weight,
        techniqueInstructions: ex.instructions,
        animationType: ex.animationType
      });
    }
    days.push({
      dayNumber: i + 1,
      dayName: selectedLabels[i] || `Día ${i + 1}: Sesión General`,
      exercises
    });
  }

  return { routineName, description, days };
}

// Compact Fallback Nutrition Advisor (in case Gemini is unavailable or rate-limited)
function getFallbackNutritionAdvice(age: any, weight: any, height: any, gender: any, objective: any, fitnessLevel: any) {
  const w = Number(weight) || 70;
  const h = Number(height) || 170;
  const a = Number(age) || 30;
  
  let bmr = gender === "femenino" 
    ? 447.593 + (9.247 * w) + (3.098 * h) - (4.33 * a)
    : 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a);
    
  let mult = fitnessLevel === "principiante" ? 1.375 : fitnessLevel === "intermedio" ? 1.55 : 1.725;
  let tdee = bmr * mult;
  
  let calories = Math.round(tdee);
  let pRatio = 0.3, cRatio = 0.4, fRatio = 0.3;
  
  if (objective === "fuerza") { calories += 150; pRatio = 0.28; cRatio = 0.45; fRatio = 0.27; }
  else if (objective === "hipertrofia") { calories += 300; pRatio = 0.25; cRatio = 0.50; fRatio = 0.25; }
  else if (objective === "resistencia") { pRatio = 0.22; cRatio = 0.55; fRatio = 0.23; }
  else if (objective === "perdida_grasa") { calories -= 450; pRatio = 0.35; cRatio = 0.35; fRatio = 0.30; }

  const protein = Math.round((calories * pRatio) / 4);
  const carbs = Math.round((calories * cRatio) / 4);
  const fat = Math.round((calories * fRatio) / 9);

  const tips = [
    "Asegura un aporte de proteínas de alta calidad distribuido uniformemente cada 3-4 horas para maximizar la síntesis muscular.",
    "Mantén una hidratación óptima bebiendo entre 2.5 y 3.5 litros de agua al día para el correcto funcionamiento metabólico.",
    "Prioriza alimentos enteros, frescos y de origen natural frente a procesados para asegurar micronutrientes esenciales.",
    "Ajusta las porciones progresivamente según tus variaciones de peso corporal semanales observadas."
  ];

  const mealPlan = [
    { meal: "Desayuno", suggestion: "Tortilla de claras y huevo entero con espinacas y tostada integral.", macros: `Prot: 25g, Carbs: 30g, Grasas: 8g` },
    { meal: "Almuerzo", suggestion: "Yogur griego natural con nueces picadas y una pieza de fruta.", macros: `Prot: 15g, Carbs: 20g, Grasas: 10g` },
    { meal: "Comida", suggestion: "Pechuga de pollo o tofu a la plancha con arroz integral y brócoli al vapor.", macros: `Prot: 40g, Carbs: 45g, Grasas: 6g` },
    { meal: "Merienda", suggestion: "Batido proteico o queso fresco batido con un puñado de almendras.", macros: `Prot: 30g, Carbs: 15g, Grasas: 7g` },
    { meal: "Cena", suggestion: "Filete de pescado blanco o salmón con verduras asadas y patata.", macros: `Prot: 35g, Carbs: 30g, Grasas: 12g` }
  ];

  return { macros: { calories, protein, carbs, fat }, tips, mealPlan };
}

// Helper function to race a promise against a timeout, and retry on 503 errors
async function callGeminiWithRetry<T>(
  apiCallFn: () => Promise<T>,
  timeoutMs: number = 60000,
  maxRetries: number = 3
): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        apiCallFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini generation timed out")), timeoutMs)
        ),
      ]);
      return result;
    } catch (error: any) {
      lastError = error;
      const is503 = error?.message?.includes("503") || error?.status === "UNAVAILABLE" || error?.status === 503 || error?.status === 529;
      const isTimeout = error?.message === "Gemini generation timed out";
      if ((is503 || isTimeout) && attempt < maxRetries) {
        console.warn(`Gemini attempt ${attempt} failed with ${is503 ? '503/529' : 'timeout'}. Retrying...`);
        // wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const app = express();
const PORT = 3000;

let staticAssetsConfigured = false;

app.use(express.json());

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("ADVERTENCIA: GEMINI_API_KEY no está configurada en las variables de entorno.");
}

// 1. Routine generator endpoint
app.post("/api/generate-routine", async (req, res) => {
  const { age, weight, height, gender, objective, fitnessLevel, daysPerWeek } = req.body;

  if (!ai) {
    console.warn("Gemini client is not configured. Serving local fallback routine.");
    const fallbackData = getFallbackRoutine(age, weight, height, gender, objective, fitnessLevel, daysPerWeek);
    return res.json(fallbackData);
  }

  const prompt = `Genera una rutina de fuerza personalizada en español para una persona con los siguientes datos:
  - Edad: ${age} años
  - Peso: ${weight} kg
  - Altura: ${height} cm
  - Género: ${gender}
  - Objetivo: ${objective} (opciones posibles: fuerza, hipertrofia, resistencia, perdida_grasa)
  - Nivel de condición física: ${fitnessLevel} (principiante, intermedio, avanzado)
  - Días de entrenamiento a la semana: ${daysPerWeek} días.

  Crea una rutina equilibrada, estructurada para cubrir los ${daysPerWeek} días de entrenamiento especificados.
  Asigna cada ejercicio a un tipo de animación de técnica correcto estrictamente de entre estos: 'squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic'. No inventes otros.

  MUY IMPORTANTE: Para la selección de ejercicios, prioriza incluir las siguientes máquinas/ejercicios que el usuario ya tiene registrados en su catálogo de entrenamiento libre:
  - Prensa de Piernas (Leg Press)
  - Jalón al Pecho en Polea
  - Contractor de Pecho (Pec Deck)
  - Press de Hombros en Máquina
  - Polea Alta para Tríceps
  - Curl Bíceps Banco Scott
  - Curl Femoral Tumbado
  - Extensiones de Cuádriceps
  - Cinta de Correr, Bici, Elíptica o Escaladora (para cardio)
  
  Completa la rutina con ejercicios básicos (ej. Sentadilla, Press Banca, Peso Muerto) según sea necesario.`;

  try {
    const response = await callGeminiWithRetry(
      () => ai!.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routineName: {
                type: Type.STRING,
                description: "Un título descriptivo para la rutina en español.",
              },
              description: {
                type: Type.STRING,
                description: "Descripción general de los objetivos y el enfoque de la rutina personalizada en español.",
              },
              days: {
                type: Type.ARRAY,
                description: "Los días de entrenamiento de la rutina.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: {
                      type: Type.INTEGER,
                      description: "Número de día correlativo (1, 2, 3...)",
                    },
                    dayName: {
                      type: Type.STRING,
                      description: "Nombre del día, ej. 'Día 1: Empuje (Pecho, Hombros, Tríceps)'.",
                    },
                    exercises: {
                      type: Type.ARRAY,
                      description: "Ejercicios para realizar en este día.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: {
                            type: Type.STRING,
                            description: "Identificador único corto del ejercicio, ej. 'squat_01'.",
                          },
                          name: {
                            type: Type.STRING,
                            description: "Nombre en español del ejercicio.",
                          },
                          sets: {
                            type: Type.INTEGER,
                            description: "Número de series sugerido (ej. 3 o 4).",
                          },
                          reps: {
                            type: Type.STRING,
                            description: "Repeticiones sugeridas (ej. '8-10', '12', '5').",
                          },
                          suggestedWeight: {
                            type: Type.STRING,
                            description: "Peso inicial recomendado o nivel de esfuerzo, ej. 'RPE 8' o 'Foco en técnica'.",
                          },
                          techniqueInstructions: {
                            type: Type.STRING,
                            description: "Explicación breve de la técnica correcta en español para evitar lesiones.",
                          },
                          animationType: {
                            type: Type.STRING,
                            description: "Debe ser estrictamente una de las siguientes: 'squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic'.",
                          },
                        },
                        required: ["id", "name", "sets", "reps", "suggestedWeight", "techniqueInstructions", "animationType"],
                      },
                    },
                  },
                  required: ["dayNumber", "dayName", "exercises"],
                },
              },
            },
            required: ["routineName", "description", "days"],
          }
        }
      })
    );

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    const is429 = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (is429) {
      console.warn("Gemini API limit reached (429). Using fallback routine...");
    } else {
      console.error("Error generating routine with Gemini, using fallback:", error);
    }
    try {
      const fallbackData = getFallbackRoutine(age, weight, height, gender, objective, fitnessLevel, daysPerWeek);
      res.json(fallbackData);
    } catch (fallbackError) {
      console.error("Critical: Error in fallback routine generator:", fallbackError);
      res.status(500).json({ error: "No se pudo generar la rutina personalizada. Inténtalo de nuevo más tarde." });
    }
  }
});

// 2. Nutrition advice endpoint
app.post("/api/nutrition-advice", async (req, res) => {
  const { age, weight, height, gender, objective, fitnessLevel } = req.body;

  if (!ai) {
    console.warn("Gemini client is not configured. Serving local fallback nutrition advice.");
    const fallbackData = getFallbackNutritionAdvice(age, weight, height, gender, objective, fitnessLevel);
    return res.json(fallbackData);
  }

  const prompt = `Calcula las necesidades nutricionales (macronutrientes) diarias aproximadas y proporciona consejos de alimentación para una persona con los siguientes datos:
  - Edad: ${age} años
  - Peso: ${weight} kg
  - Altura: ${height} cm
  - Género: ${gender}
  - Objetivo: ${objective} (opciones posibles: fuerza, hipertrofia, resistencia, perdida_grasa)
  - Nivel de condición física: ${fitnessLevel}

  Devuelve una distribución de macros equilibrada (Calorías, Proteínas, Carbohidratos y Grasas) idónea para este perfil físico y objetivo, junto con 4 consejos de nutrición específicos en español y un menú sugerido para el día (Desayuno, Almuerzo, Comida, Merienda, Cena).`;

  try {
    const response = await callGeminiWithRetry(
      () => ai!.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              macros: {
                type: Type.OBJECT,
                properties: {
                  calories: {
                    type: Type.INTEGER,
                    description: "Calorías totales diarias recomendadas.",
                  },
                  protein: {
                    type: Type.INTEGER,
                    description: "Gramos de proteína recomendados al día.",
                  },
                  carbs: {
                    type: Type.INTEGER,
                    description: "Gramos de carbohidratos recomendados al día.",
                  },
                  fat: {
                    type: Type.INTEGER,
                    description: "Gramos de grasa recomendados al día.",
                  },
                },
                required: ["calories", "protein", "carbs", "fat"],
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 consejos de alimentación en español específicos para su objetivo físico.",
              },
              mealPlan: {
                type: Type.ARRAY,
                description: "Sugerencias de comidas diarias.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    meal: {
                      type: Type.STRING,
                      description: "Momento del día (ej. Desayuno, Almuerzo, Comida, Merienda, Cena).",
                    },
                    suggestion: {
                      type: Type.STRING,
                      description: "Plato sugerido alto en nutrientes en español.",
                    },
                    macros: {
                      type: Type.STRING,
                      description: "Estimación de macros, ej. 'Proteína: 30g, Carbs: 45g, Grasas: 10g'.",
                    },
                  },
                  required: ["meal", "suggestion", "macros"],
                },
              },
            },
            required: ["macros", "tips", "mealPlan"],
          }
        }
      })
    );

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    const is429 = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (is429) {
      console.warn("Gemini API limit reached (429). Using fallback nutrition advice...");
    } else {
      console.error("Error generating nutrition advice with Gemini, using fallback:", error);
    }
    try {
      const fallbackData = getFallbackNutritionAdvice(age, weight, height, gender, objective, fitnessLevel);
      res.json(fallbackData);
    } catch (fallbackError) {
      console.error("Critical: Error in fallback nutrition advisor:", fallbackError);
      res.status(500).json({ error: "No se pudo generar el plan nutricional. Inténtalo de nuevo más tarde." });
    }
  }
});

// 3. Alternative exercise endpoint
app.post("/api/alternative-exercise", async (req, res) => {
  const { exerciseName, reason } = req.body;

  if (!ai) {
    console.warn("Gemini client is not configured. Serving local fallback alternative.");
    return res.json({
      id: "alt_" + Date.now(),
      name: "Variante de " + exerciseName,
      sets: 3,
      reps: "10",
      suggestedWeight: "Peso moderado",
      techniqueInstructions: "Mantén buena técnica. (Generado por fallback local)",
      animationType: "generic"
    });
  }

  const prompt = `Proporciona un ejercicio alternativo a "${exerciseName}".
  El motivo del cambio es: "${reason}". (Por ejemplo, falta de material, lesión o molestia).
  Genera un ejercicio que trabaje grupos musculares similares pero que se adapte a este motivo.
  Devuelve la información en español y asigna un tipo de animación válido ('squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic').`;

  try {
    const response = await callGeminiWithRetry(
      () => ai!.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Identificador único corto del ejercicio." },
              name: { type: Type.STRING, description: "Nombre del ejercicio alternativo en español." },
              sets: { type: Type.INTEGER, description: "Número de series sugerido." },
              reps: { type: Type.STRING, description: "Repeticiones sugeridas." },
              suggestedWeight: { type: Type.STRING, description: "Peso sugerido o recomendación." },
              techniqueInstructions: { type: Type.STRING, description: "Explicación breve de la técnica." },
              animationType: { type: Type.STRING, description: "Debe ser: squat, bench_press, deadlift, bicep_curl, shoulder_press, push_up, pull_up, lunge, generic." },
            },
            required: ["id", "name", "sets", "reps", "suggestedWeight", "techniqueInstructions", "animationType"],
          }
        }
      })
    );

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    const is429 = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (is429) {
      console.warn("Gemini API limit reached (429). Using fallback alternative exercise...");
    } else {
      console.error("Error generating alternative exercise with Gemini:", error);
    }
    res.json({
      id: "alt_" + Date.now(),
      name: "Variante de " + exerciseName,
      sets: 3,
      reps: "10-12",
      suggestedWeight: "Peso adaptado",
      techniqueInstructions: "Asegúrate de no sentir dolor al realizar el movimiento.",
      animationType: "generic"
    });
  }
});

export function setupStaticAssets() {
  if (staticAssetsConfigured) return;

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  staticAssetsConfigured = true;
}

// Setup development server or serve build directory
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    setupStaticAssets();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const executedFilePath = process.argv[1] || "";
const isDirectExecution = /(?:^|\/)server\.(?:ts|js|cjs|mjs)$/.test(executedFilePath);

if (isDirectExecution) {
  startServer();
}

export default app;
