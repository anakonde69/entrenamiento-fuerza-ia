import { useState, FormEvent } from "react";
import { Sparkles, Dumbbell, Trophy, ArrowRight, Loader2, Apple, CheckCircle2 } from "lucide-react";
import { UserProfile, Routine, NutritionAdvice } from "../types";

interface AIPromptScreenProps {
  onGenerationComplete: (profile: UserProfile, routine: Routine, nutrition: NutritionAdvice) => void;
}

export default function AIPromptScreen({ onGenerationComplete }: AIPromptScreenProps) {
  const [age, setAge] = useState<number>(28);
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [gender, setGender] = useState<string>("Masculino");
  const [objective, setObjective] = useState<string>("fuerza");
  const [fitnessLevel, setFitnessLevel] = useState<string>("principiante");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const userProfile: UserProfile = {
      age,
      weight,
      height,
      gender,
      objective,
      fitnessLevel,
      daysPerWeek,
    };

    try {
      // 1. Generate Routine
      setLoadingStep("Diseñando tu rutina de fuerza personalizada con IA...");
      const routineRes = await fetch("/api/generate-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });

      if (!routineRes.ok) {
        throw new Error("No se pudo generar la rutina. Por favor verifica la clave de Gemini o vuelve a intentarlo.");
      }
      const routineData = await routineRes.json();

      // 2. Generate Nutrition Advice
      setLoadingStep("Calculando tus macronutrientes y plan de alimentación...");
      const nutritionRes = await fetch("/api/nutrition-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });

      if (!nutritionRes.ok) {
        throw new Error("No se pudo generar el consejo nutricional.");
      }
      const nutritionData = await nutritionRes.json();

      // Formulate final structure
      const routineWithId: Routine = {
        ...routineData,
        id: "routine_" + Date.now(),
        createdAt: new Date().toISOString(),
      };

      // Call success callback
      onGenerationComplete(userProfile, routineWithId, nutritionData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado al conectar con el servidor de IA.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const objectivesList = [
    { value: "fuerza", label: "Fuerza Máxima", desc: "Mejorar levantamientos básicos y densidad muscular" },
    { value: "hipertrofia", label: "Hipertrofia Muscular", desc: "Aumentar masa muscular y definición" },
    { value: "resistencia", label: "Resistencia", desc: "Acondicionamiento físico y altas repeticiones" },
    { value: "perdida_grasa", label: "Pérdida de Grasa", desc: "Preservar músculo quemando grasa eficientemente" },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 text-red-400 rounded-full text-xs font-bold tracking-wide uppercase border border-red-500/20 mb-4 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Inteligencia Artificial de Entrenamiento Panatta
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl uppercase">
          Crea tu Plan de Fuerza <span className="text-red-500">Panatta</span>
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-base text-zinc-400">
          Dinos tu edad, tus objetivos físicos y condición actual para que nuestra IA estructure una rutina adaptada a tus necesidades.
        </p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-900 shadow-2xl overflow-hidden p-6 sm:p-10">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">Construyendo tu plan...</h3>
            <p className="text-sm text-zinc-400 animate-pulse text-center max-w-md px-4">
              {loadingStep}
            </p>
            <div className="mt-8 flex flex-col gap-2.5 w-full max-w-xs text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                <span>Analizando datos de perfil</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center shrink-0 ${loadingStep.includes('rutina') ? 'border-red-500 animate-pulse' : ''}`}>
                  {loadingStep.includes('macronutrientes') && <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />}
                </div>
                <span className={loadingStep.includes('rutina') ? 'text-zinc-300 font-medium' : ''}>Generando rutina personalizada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border border-zinc-800 shrink-0 ${loadingStep.includes('macronutrientes') ? 'border-red-500 animate-pulse' : ''}`} />
                <span className={loadingStep.includes('macronutrientes') ? 'text-zinc-300 font-medium' : ''}>Calculando macros nutricionales</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-sm text-red-400">
                <p className="font-semibold mb-1">Error al generar el plan</p>
                <p>{error}</p>
                <p className="text-xs mt-2 text-zinc-500">Asegúrate de que el servidor está corriendo y de que tienes configurada la clave <code className="bg-red-950 px-1 py-0.5 rounded">GEMINI_API_KEY</code> en los Secrets de la app.</p>
              </div>
            )}

            {/* Basic demographics & dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Edad (años)</label>
                <input
                  type="number"
                  min="12"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Peso Actual (kg)</label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Altura (cm)</label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-semibold"
                  required
                />
              </div>
            </div>

            {/* Gender and Training Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Género</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Masculino", "Femenino", "Otro"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all ${
                        gender === g
                          ? "border-red-500 bg-red-600/15 text-red-400 font-bold"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Días de Entrenamiento a la semana</label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                        daysPerWeek === d
                          ? "border-red-500 bg-red-600/15 text-red-400 font-bold"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Nivel de Condición Física</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: "principiante", label: "Principiante", desc: "Menos de 6 meses de fuerza constante" },
                  { value: "intermedio", label: "Intermedio", desc: "Entre 6 meses y 2 años levantando" },
                  { value: "avanzado", label: "Avanzado", desc: "Más de 2 años de entrenamiento estructurado" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFitnessLevel(item.value)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      fitnessLevel === item.value
                        ? "border-red-500 bg-red-600/15 text-red-400 ring-1 ring-red-500 font-semibold"
                        : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="font-semibold text-sm block">{item.label}</div>
                    <div className="text-xs text-zinc-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Goals Select */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Objetivo Físico Primario</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {objectivesList.map((obj) => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setObjective(obj.value)}
                    className={`p-4 rounded-xl text-left border transition-all flex items-start gap-3.5 ${
                      objective === obj.value
                        ? "border-red-500 bg-red-600/15 text-red-400 ring-1 ring-red-500"
                        : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${objective === obj.value ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-500'}`}>
                      {obj.value === "fuerza" ? <Dumbbell className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{obj.label}</div>
                      <div className="text-xs text-zinc-500 mt-1">{obj.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-red-600/25 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Generar Rutina Personalizada por IA</span>
                <Sparkles className="w-5 h-5" />
              </button>
              <p className="text-center text-xs text-zinc-500 mt-3 font-medium">
                La rutina se basará en las directrices de entrenamiento de fuerza recomendadas por la ACSM.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
