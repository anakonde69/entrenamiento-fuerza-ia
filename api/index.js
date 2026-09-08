// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
function getFallbackRoutine(age, weight, height, gender, objective, fitnessLevel, daysPerWeek) {
  const levelText = fitnessLevel === "principiante" ? "Principiante" : fitnessLevel === "intermedio" ? "Intermedio" : "Avanzado";
  const names = {
    fuerza: "Ruta de Fuerza M\xE1xima",
    hipertrofia: "Hipertrofia y Desarrollo Muscular",
    resistencia: "Acondicionamiento y Resistencia Muscular",
    perdida_grasa: "D\xE9ficit y Tonificaci\xF3n Corporal"
  };
  const routineName = `${names[objective] || "Entrenamiento Personalizado"} (${levelText})`;
  const description = `Rutina estructurada de alto rendimiento adaptada para tu perfil f\xEDsico de ${weight} kg y nivel ${levelText}. (Generada mediante motor de contingencia local debido a alta demanda en los servidores de IA)`;
  const exercisePool = [
    { id: "m_prensa_leg", name: "Prensa de Piernas (Leg Press)", animationType: "squat", instructions: "Controla la bajada y empuja con toda la planta del pie.", sets: 4, reps: "10-12", weight: "Moderado-Pesado" },
    { id: "m_jalon_polea", name: "Jal\xF3n al Pecho en Polea", animationType: "pull_up", instructions: "Lleva la barra al pecho juntando las esc\xE1pulas.", sets: 4, reps: "10-12", weight: "RPE 8" },
    { id: "m_pec_deck", name: "Contractor de Pecho (Pec Deck)", animationType: "bench_press", instructions: "Mant\xE9n el pecho alto y junta los brazos controladamente.", sets: 3, reps: "12", weight: "Moderado" },
    { id: "m_curl_scott", name: "Curl B\xEDceps Banco Scott", animationType: "bicep_curl", instructions: "Mant\xE9n axilas apoyadas y flexiona sin usar inercia.", sets: 3, reps: "12", weight: "Moderado" },
    { id: "m_press_hombros", name: "Press de Hombros en M\xE1quina", animationType: "shoulder_press", instructions: "Empuja hacia arriba y controla el peso en la bajada.", sets: 3, reps: "10", weight: "RPE 7.5" },
    { id: "m_extension_triceps", name: "Polea Alta para Tr\xEDceps", animationType: "push_up", instructions: "Fija los codos a las costillas y extiende el brazo completo.", sets: 3, reps: "12-15", weight: "Moderado" },
    { id: "m_curl_femoral", name: "Curl Femoral Tumbado", animationType: "deadlift", instructions: "Mant\xE9n la cadera pegada al banco y flexiona fuerte.", sets: 3, reps: "10-12", weight: "Moderado" },
    { id: "m_extension_cuadriceps", name: "Extensiones de Cu\xE1driceps", animationType: "lunge", instructions: "Sube explosivo y aguanta 1 segundo arriba.", sets: 3, reps: "12-15", weight: "Moderado" }
  ];
  const days = [];
  const validDays = Math.min(Math.max(Number(daysPerWeek) || 3, 1), 7);
  const dayLabels = {
    1: ["D\xEDa \xDAnico: Full Body Eficiente"],
    2: ["D\xEDa 1: Torso (Empuje/Tir\xF3n)", "D\xEDa 2: Pierna y Core"],
    3: ["D\xEDa 1: Empuje (Torso)", "D\xEDa 2: Tir\xF3n (Espalda/B\xEDceps)", "D\xEDa 3: Piernas y Core"],
    4: ["D\xEDa 1: Empuje Fuerza", "D\xEDa 2: Piernas Fuerza", "D\xEDa 3: Tir\xF3n Hipertrofia", "D\xEDa 4: Core y Cardio"],
    5: ["D\xEDa 1: Pecho/Tr\xEDceps", "D\xEDa 2: Espalda/B\xEDceps", "D\xEDa 3: Piernas", "D\xEDa 4: Hombro/Core", "D\xEDa 5: Acondicionamiento"],
    6: ["D\xEDa 1: Empuje", "D\xEDa 2: Tir\xF3n", "D\xEDa 3: Piernas", "D\xEDa 4: Torso", "D\xEDa 5: Piernas Volumen", "D\xEDa 6: Hombros/Brazos"],
    7: ["D\xEDa 1: Lunes Empuje", "D\xEDa 2: Martes Tir\xF3n", "D\xEDa 3: Mi\xE9rcoles Pierna", "D\xEDa 4: Jueves Torso", "D\xEDa 5: Viernes Pierna", "D\xEDa 6: S\xE1bado Brazos", "D\xEDa 7: Domingo Zona Media"]
  };
  const selectedLabels = dayLabels[validDays] || Array.from({ length: validDays }, (_, i) => `D\xEDa ${i + 1}: Sesi\xF3n de Entrenamiento`);
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
      dayName: selectedLabels[i] || `D\xEDa ${i + 1}: Sesi\xF3n General`,
      exercises
    });
  }
  return { routineName, description, days };
}
function getFallbackNutritionAdvice(age, weight, height, gender, objective, fitnessLevel) {
  const w = Number(weight) || 70;
  const h = Number(height) || 170;
  const a = Number(age) || 30;
  let bmr = gender === "femenino" ? 447.593 + 9.247 * w + 3.098 * h - 4.33 * a : 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
  let mult = fitnessLevel === "principiante" ? 1.375 : fitnessLevel === "intermedio" ? 1.55 : 1.725;
  let tdee = bmr * mult;
  let calories = Math.round(tdee);
  let pRatio = 0.3, cRatio = 0.4, fRatio = 0.3;
  if (objective === "fuerza") {
    calories += 150;
    pRatio = 0.28;
    cRatio = 0.45;
    fRatio = 0.27;
  } else if (objective === "hipertrofia") {
    calories += 300;
    pRatio = 0.25;
    cRatio = 0.5;
    fRatio = 0.25;
  } else if (objective === "resistencia") {
    pRatio = 0.22;
    cRatio = 0.55;
    fRatio = 0.23;
  } else if (objective === "perdida_grasa") {
    calories -= 450;
    pRatio = 0.35;
    cRatio = 0.35;
    fRatio = 0.3;
  }
  const protein = Math.round(calories * pRatio / 4);
  const carbs = Math.round(calories * cRatio / 4);
  const fat = Math.round(calories * fRatio / 9);
  const tips = [
    "Asegura un aporte de prote\xEDnas de alta calidad distribuido uniformemente cada 3-4 horas para maximizar la s\xEDntesis muscular.",
    "Mant\xE9n una hidrataci\xF3n \xF3ptima bebiendo entre 2.5 y 3.5 litros de agua al d\xEDa para el correcto funcionamiento metab\xF3lico.",
    "Prioriza alimentos enteros, frescos y de origen natural frente a procesados para asegurar micronutrientes esenciales.",
    "Ajusta las porciones progresivamente seg\xFAn tus variaciones de peso corporal semanales observadas."
  ];
  const mealPlan = [
    { meal: "Desayuno", suggestion: "Tortilla de claras y huevo entero con espinacas y tostada integral.", macros: `Prot: 25g, Carbs: 30g, Grasas: 8g` },
    { meal: "Almuerzo", suggestion: "Yogur griego natural con nueces picadas y una pieza de fruta.", macros: `Prot: 15g, Carbs: 20g, Grasas: 10g` },
    { meal: "Comida", suggestion: "Pechuga de pollo o tofu a la plancha con arroz integral y br\xF3coli al vapor.", macros: `Prot: 40g, Carbs: 45g, Grasas: 6g` },
    { meal: "Merienda", suggestion: "Batido proteico o queso fresco batido con un pu\xF1ado de almendras.", macros: `Prot: 30g, Carbs: 15g, Grasas: 7g` },
    { meal: "Cena", suggestion: "Filete de pescado blanco o salm\xF3n con verduras asadas y patata.", macros: `Prot: 35g, Carbs: 30g, Grasas: 12g` }
  ];
  return { macros: { calories, protein, carbs, fat }, tips, mealPlan };
}
async function callGeminiWithRetry(apiCallFn, timeoutMs = 6e4, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        apiCallFn(),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Gemini generation timed out")), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error;
      const is503 = error?.message?.includes("503") || error?.status === "UNAVAILABLE" || error?.status === 503 || error?.status === 529;
      const isTimeout = error?.message === "Gemini generation timed out";
      if ((is503 || isTimeout) && attempt < maxRetries) {
        console.warn(`Gemini attempt ${attempt} failed with ${is503 ? "503/529" : "timeout"}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2e3 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
var app = express();
var PORT = 3e3;
var staticAssetsConfigured = false;
app.use(express.json());
var geminiApiKey = process.env.GEMINI_API_KEY;
var ai = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
} else {
  console.warn("ADVERTENCIA: GEMINI_API_KEY no est\xE1 configurada en las variables de entorno.");
}
app.post("/api/generate-routine", async (req, res) => {
  const { age, weight, height, gender, objective, fitnessLevel, daysPerWeek } = req.body;
  if (!ai) {
    console.warn("Gemini client is not configured. Serving local fallback routine.");
    const fallbackData = getFallbackRoutine(age, weight, height, gender, objective, fitnessLevel, daysPerWeek);
    return res.json(fallbackData);
  }
  const prompt = `Genera una rutina de fuerza personalizada en espa\xF1ol para una persona con los siguientes datos:
  - Edad: ${age} a\xF1os
  - Peso: ${weight} kg
  - Altura: ${height} cm
  - G\xE9nero: ${gender}
  - Objetivo: ${objective} (opciones posibles: fuerza, hipertrofia, resistencia, perdida_grasa)
  - Nivel de condici\xF3n f\xEDsica: ${fitnessLevel} (principiante, intermedio, avanzado)
  - D\xEDas de entrenamiento a la semana: ${daysPerWeek} d\xEDas.

  Crea una rutina equilibrada, estructurada para cubrir los ${daysPerWeek} d\xEDas de entrenamiento especificados.
  Asigna cada ejercicio a un tipo de animaci\xF3n de t\xE9cnica correcto estrictamente de entre estos: 'squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic'. No inventes otros.

  MUY IMPORTANTE: Para la selecci\xF3n de ejercicios, prioriza incluir las siguientes m\xE1quinas/ejercicios que el usuario ya tiene registrados en su cat\xE1logo de entrenamiento libre:
  - Prensa de Piernas (Leg Press)
  - Jal\xF3n al Pecho en Polea
  - Contractor de Pecho (Pec Deck)
  - Press de Hombros en M\xE1quina
  - Polea Alta para Tr\xEDceps
  - Curl B\xEDceps Banco Scott
  - Curl Femoral Tumbado
  - Extensiones de Cu\xE1driceps
  - Cinta de Correr, Bici, El\xEDptica o Escaladora (para cardio)
  
  Completa la rutina con ejercicios b\xE1sicos (ej. Sentadilla, Press Banca, Peso Muerto) seg\xFAn sea necesario.`;
  try {
    const response = await callGeminiWithRetry(
      () => ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routineName: {
                type: Type.STRING,
                description: "Un t\xEDtulo descriptivo para la rutina en espa\xF1ol."
              },
              description: {
                type: Type.STRING,
                description: "Descripci\xF3n general de los objetivos y el enfoque de la rutina personalizada en espa\xF1ol."
              },
              days: {
                type: Type.ARRAY,
                description: "Los d\xEDas de entrenamiento de la rutina.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: {
                      type: Type.INTEGER,
                      description: "N\xFAmero de d\xEDa correlativo (1, 2, 3...)"
                    },
                    dayName: {
                      type: Type.STRING,
                      description: "Nombre del d\xEDa, ej. 'D\xEDa 1: Empuje (Pecho, Hombros, Tr\xEDceps)'."
                    },
                    exercises: {
                      type: Type.ARRAY,
                      description: "Ejercicios para realizar en este d\xEDa.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: {
                            type: Type.STRING,
                            description: "Identificador \xFAnico corto del ejercicio, ej. 'squat_01'."
                          },
                          name: {
                            type: Type.STRING,
                            description: "Nombre en espa\xF1ol del ejercicio."
                          },
                          sets: {
                            type: Type.INTEGER,
                            description: "N\xFAmero de series sugerido (ej. 3 o 4)."
                          },
                          reps: {
                            type: Type.STRING,
                            description: "Repeticiones sugeridas (ej. '8-10', '12', '5')."
                          },
                          suggestedWeight: {
                            type: Type.STRING,
                            description: "Peso inicial recomendado o nivel de esfuerzo, ej. 'RPE 8' o 'Foco en t\xE9cnica'."
                          },
                          techniqueInstructions: {
                            type: Type.STRING,
                            description: "Explicaci\xF3n breve de la t\xE9cnica correcta en espa\xF1ol para evitar lesiones."
                          },
                          animationType: {
                            type: Type.STRING,
                            description: "Debe ser estrictamente una de las siguientes: 'squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic'."
                          }
                        },
                        required: ["id", "name", "sets", "reps", "suggestedWeight", "techniqueInstructions", "animationType"]
                      }
                    }
                  },
                  required: ["dayNumber", "dayName", "exercises"]
                }
              }
            },
            required: ["routineName", "description", "days"]
          }
        }
      })
    );
    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
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
      res.status(500).json({ error: "No se pudo generar la rutina personalizada. Int\xE9ntalo de nuevo m\xE1s tarde." });
    }
  }
});
app.post("/api/nutrition-advice", async (req, res) => {
  const { age, weight, height, gender, objective, fitnessLevel } = req.body;
  if (!ai) {
    console.warn("Gemini client is not configured. Serving local fallback nutrition advice.");
    const fallbackData = getFallbackNutritionAdvice(age, weight, height, gender, objective, fitnessLevel);
    return res.json(fallbackData);
  }
  const prompt = `Calcula las necesidades nutricionales (macronutrientes) diarias aproximadas y proporciona consejos de alimentaci\xF3n para una persona con los siguientes datos:
  - Edad: ${age} a\xF1os
  - Peso: ${weight} kg
  - Altura: ${height} cm
  - G\xE9nero: ${gender}
  - Objetivo: ${objective} (opciones posibles: fuerza, hipertrofia, resistencia, perdida_grasa)
  - Nivel de condici\xF3n f\xEDsica: ${fitnessLevel}

  Devuelve una distribuci\xF3n de macros equilibrada (Calor\xEDas, Prote\xEDnas, Carbohidratos y Grasas) id\xF3nea para este perfil f\xEDsico y objetivo, junto con 4 consejos de nutrici\xF3n espec\xEDficos en espa\xF1ol y un men\xFA sugerido para el d\xEDa (Desayuno, Almuerzo, Comida, Merienda, Cena).`;
  try {
    const response = await callGeminiWithRetry(
      () => ai.models.generateContent({
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
                    description: "Calor\xEDas totales diarias recomendadas."
                  },
                  protein: {
                    type: Type.INTEGER,
                    description: "Gramos de prote\xEDna recomendados al d\xEDa."
                  },
                  carbs: {
                    type: Type.INTEGER,
                    description: "Gramos de carbohidratos recomendados al d\xEDa."
                  },
                  fat: {
                    type: Type.INTEGER,
                    description: "Gramos de grasa recomendados al d\xEDa."
                  }
                },
                required: ["calories", "protein", "carbs", "fat"]
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 consejos de alimentaci\xF3n en espa\xF1ol espec\xEDficos para su objetivo f\xEDsico."
              },
              mealPlan: {
                type: Type.ARRAY,
                description: "Sugerencias de comidas diarias.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    meal: {
                      type: Type.STRING,
                      description: "Momento del d\xEDa (ej. Desayuno, Almuerzo, Comida, Merienda, Cena)."
                    },
                    suggestion: {
                      type: Type.STRING,
                      description: "Plato sugerido alto en nutrientes en espa\xF1ol."
                    },
                    macros: {
                      type: Type.STRING,
                      description: "Estimaci\xF3n de macros, ej. 'Prote\xEDna: 30g, Carbs: 45g, Grasas: 10g'."
                    }
                  },
                  required: ["meal", "suggestion", "macros"]
                }
              }
            },
            required: ["macros", "tips", "mealPlan"]
          }
        }
      })
    );
    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
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
      res.status(500).json({ error: "No se pudo generar el plan nutricional. Int\xE9ntalo de nuevo m\xE1s tarde." });
    }
  }
});
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
      techniqueInstructions: "Mant\xE9n buena t\xE9cnica. (Generado por fallback local)",
      animationType: "generic"
    });
  }
  const prompt = `Proporciona un ejercicio alternativo a "${exerciseName}".
  El motivo del cambio es: "${reason}". (Por ejemplo, falta de material, lesi\xF3n o molestia).
  Genera un ejercicio que trabaje grupos musculares similares pero que se adapte a este motivo.
  Devuelve la informaci\xF3n en espa\xF1ol y asigna un tipo de animaci\xF3n v\xE1lido ('squat', 'bench_press', 'deadlift', 'bicep_curl', 'shoulder_press', 'push_up', 'pull_up', 'lunge', 'generic').`;
  try {
    const response = await callGeminiWithRetry(
      () => ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Identificador \xFAnico corto del ejercicio." },
              name: { type: Type.STRING, description: "Nombre del ejercicio alternativo en espa\xF1ol." },
              sets: { type: Type.INTEGER, description: "N\xFAmero de series sugerido." },
              reps: { type: Type.STRING, description: "Repeticiones sugeridas." },
              suggestedWeight: { type: Type.STRING, description: "Peso sugerido o recomendaci\xF3n." },
              techniqueInstructions: { type: Type.STRING, description: "Explicaci\xF3n breve de la t\xE9cnica." },
              animationType: { type: Type.STRING, description: "Debe ser: squat, bench_press, deadlift, bicep_curl, shoulder_press, push_up, pull_up, lunge, generic." }
            },
            required: ["id", "name", "sets", "reps", "suggestedWeight", "techniqueInstructions", "animationType"]
          }
        }
      })
    );
    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
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
      techniqueInstructions: "Aseg\xFArate de no sentir dolor al realizar el movimiento.",
      animationType: "generic"
    });
  }
});
function setupStaticAssets() {
  if (staticAssetsConfigured) return;
  const candidates = [
    path.join(process.cwd(), "dist"),
    path.join(__dirname, "..", "dist"),
    path.join(__dirname, "dist")
  ];
  const distPath = candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) || candidates[0];
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.use((err, _req, res, next) => {
    if (err) {
      res.status(404).json({ error: "Not found" });
    } else {
      next();
    }
  });
  staticAssetsConfigured = true;
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    setupStaticAssets();
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
var executedFilePath = process.argv[1] || "";
var isDirectExecution = /(?:^|\/)server\.(?:ts|js|cjs|mjs)$/.test(executedFilePath);
if (isDirectExecution) {
  startServer();
}
var server_default = app;

// api-src/index.ts
var config = { maxDuration: 30 };
async function handler(req, res) {
  try {
    await server_default(req, res);
  } catch (err) {
    console.error("API ERROR:", err);
    try {
      if (!res.headersSent) {
        res.status(500).json({
          error: err?.message || String(err),
          stack: err?.stack ? err.stack.split("\n").slice(0, 8).join("\n") : void 0
        });
      } else {
        res.end();
      }
    } catch (_) {
      try {
        res.status(500).send("API error: " + (err?.message || String(err)));
      } catch (__) {
      }
    }
  }
}
export {
  config,
  handler as default
};
