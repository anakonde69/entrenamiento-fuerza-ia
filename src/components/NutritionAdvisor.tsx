import { useState, FormEvent } from "react";
import { Apple, Scale, Flame, RefreshCw, Plus, Check } from "lucide-react";
import { NutritionAdvice, UserProfile } from "../types";

interface NutritionAdvisorProps {
  advice: NutritionAdvice;
  profile: UserProfile;
  onRefreshAdvice: () => void;
}

export default function NutritionAdvisor({ advice, profile, onRefreshAdvice }: NutritionAdvisorProps) {
  // Simple calorie tracker inside the section
  const [consumedCalories, setConsumedCalories] = useState<number>(0);
  const [consumedProtein, setConsumedProtein] = useState<number>(0);
  const [consumedCarbs, setConsumedCarbs] = useState<number>(0);
  const [consumedFat, setConsumedFat] = useState<number>(0);

  const [inputCal, setInputCal] = useState<string>("");
  const [inputProt, setInputProt] = useState<string>("");
  const [inputCarb, setInputCarb] = useState<string>("");
  const [inputFat, setInputFat] = useState<string>("");

  const handleAddMacros = (e: FormEvent) => {
    e.preventDefault();
    setConsumedCalories((prev) => prev + (Number(inputCal) || 0));
    setConsumedProtein((prev) => prev + (Number(inputProt) || 0));
    setConsumedCarbs((prev) => prev + (Number(inputCarb) || 0));
    setConsumedFat((prev) => prev + (Number(inputFat) || 0));

    // Reset inputs
    setInputCal("");
    setInputProt("");
    setInputCarb("");
    setInputFat("");
  };

  const resetToday = () => {
    setConsumedCalories(0);
    setConsumedProtein(0);
    setConsumedCarbs(0);
    setConsumedFat(0);
  };

  // Percentages for rings/progress bars
  const calPercent = Math.min(100, (consumedCalories / advice.macros.calories) * 100);
  const protPercent = Math.min(100, (consumedProtein / advice.macros.protein) * 100);
  const carbsPercent = Math.min(100, (consumedCarbs / advice.macros.carbs) * 100);
  const fatPercent = Math.min(100, (consumedFat / advice.macros.fat) * 100);

  const objectiveText = {
    fuerza: "Desarrollo de Fuerza",
    hipertrofia: "Ganancia de Masa Muscular",
    resistencia: "Acondicionamiento y Resistencia",
    perdida_grasa: "Déficit Calórico Eficiente"
  }[profile.objective] || "Mantenimiento Saludable";

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-red-400 bg-red-600/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Sugerencia Nutricional Inteligente
          </span>
          <h2 className="text-2xl font-black mt-2 text-white uppercase">
            Macros Recomendados para {objectiveText}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-semibold">Calculado por IA para un perfil de {profile.age} años y {profile.weight} kg.</p>
        </div>

        <button
          onClick={onRefreshAdvice}
          className="flex items-center gap-1.5 py-2 px-3.5 border border-zinc-800 rounded-xl hover:bg-zinc-900 bg-black text-zinc-300 font-bold text-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-red-500" />
          Recalcular Macros
        </button>
      </div>

      {/* Recommended Target Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between shadow-md">
          <span className="text-xs font-bold text-amber-400 block uppercase">Calorías Diarias</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{advice.macros.calories}</span>
            <span className="text-xs text-zinc-500 font-bold ml-1">kcal</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-red-600/30 p-5 rounded-2xl flex flex-col justify-between shadow-md">
          <span className="text-xs font-bold text-red-400 block uppercase">Proteínas</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{advice.macros.protein}</span>
            <span className="text-xs text-zinc-500 font-bold ml-1">g</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between shadow-md">
          <span className="text-xs font-bold text-red-500 block uppercase">Carbohidratos</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{advice.macros.carbs}</span>
            <span className="text-xs text-zinc-500 font-bold ml-1">g</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between shadow-md">
          <span className="text-xs font-bold text-zinc-400 block uppercase">Grasas</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{advice.macros.fat}</span>
            <span className="text-xs text-zinc-500 font-bold ml-1">g</span>
          </div>
        </div>
      </div>

      {/* Main Core Layout: Tracker and Meal Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Consumed Calories Tracker (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
            <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
              <Apple className="w-5 h-5 text-red-500" />
              Tu Consumo Diario de Macros
            </h3>
            <button
              onClick={resetToday}
              className="text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer uppercase"
            >
              Reiniciar Día
            </button>
          </div>

          {/* Consumed Progress indicators */}
          <div className="space-y-4">
            {/* Calories Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-400">Calorías Diarias</span>
                <span className="text-white font-bold font-mono">{consumedCalories} / {advice.macros.calories} kcal ({calPercent.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-black h-2.5 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="bg-red-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${calPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              {/* Protein indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-red-400 font-mono">PROT</span>
                  <span className="text-zinc-400 font-mono">{consumedProtein}g / {advice.macros.protein}g</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-850">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${protPercent}%` }} />
                </div>
              </div>

              {/* Carbs indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-red-300 font-mono">CARB</span>
                  <span className="text-zinc-400 font-mono">{consumedCarbs}g / {advice.macros.carbs}g</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-850">
                  <div className="bg-red-600 h-full rounded-full" style={{ width: `${carbsPercent}%` }} />
                </div>
              </div>

              {/* Fats indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-zinc-400 font-mono">GRAS</span>
                  <span className="text-zinc-400 font-mono">{consumedFat}g / {advice.macros.fat}g</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-850">
                  <div className="bg-zinc-500 h-full rounded-full" style={{ width: `${fatPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddMacros} className="p-4 bg-black rounded-xl space-y-3.5 border border-zinc-850">
            <span className="text-xs font-bold text-zinc-400 block uppercase font-mono">Registrar alimentos / macros</span>
            
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">KCAL</label>
                <input
                  type="number"
                  placeholder="kcal"
                  value={inputCal}
                  onChange={(e) => setInputCal(e.target.value)}
                  className="w-full px-2 py-1.5 text-center text-xs rounded border border-zinc-800 bg-zinc-950 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">PROT (g)</label>
                <input
                  type="number"
                  placeholder="g"
                  value={inputProt}
                  onChange={(e) => setInputProt(e.target.value)}
                  className="w-full px-2 py-1.5 text-center text-xs rounded border border-zinc-800 bg-zinc-950 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">CARBS (g)</label>
                <input
                  type="number"
                  placeholder="g"
                  value={inputCarb}
                  onChange={(e) => setInputCarb(e.target.value)}
                  className="w-full px-2 py-1.5 text-center text-xs rounded border border-zinc-800 bg-zinc-950 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">GRASA (g)</label>
                <input
                  type="number"
                  placeholder="g"
                  value={inputFat}
                  onChange={(e) => setInputFat(e.target.value)}
                  className="w-full px-2 py-1.5 text-center text-xs rounded border border-zinc-800 bg-zinc-950 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md shadow-red-600/25 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Sumar Macros Consumidos
            </button>
          </form>
        </div>

        {/* Right Column: Tips (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
              Consejos de Nutrición Deportiva
            </h3>
            <ul className="space-y-3">
              {advice.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2 bg-black p-3 rounded-xl border border-zinc-850">
                  <Check className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* Suggested Daily Menu (Horizontal Plan) */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
          Sugerencia de Menú Diario Saludable
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {advice.mealPlan.map((mp, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl bg-black border border-zinc-850 flex flex-col justify-between gap-2.5 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-red-400 uppercase tracking-widest">{mp.meal}</span>
                <p className="font-semibold text-zinc-200 mt-1">{mp.suggestion}</p>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold font-mono">{mp.macros}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
