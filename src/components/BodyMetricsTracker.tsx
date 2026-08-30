import { useState, FormEvent } from "react";
import { Scale, Heart, Plus, Calendar, Trash2, TrendingDown } from "lucide-react";
import { BodyMetricLog } from "../types";

interface BodyMetricsTrackerProps {
  metrics: BodyMetricLog[];
  onAddMetric: (metric: BodyMetricLog) => void;
  onDeleteMetric: (id: string) => void;
}

export default function BodyMetricsTracker({ metrics, onAddMetric, onDeleteMetric }: BodyMetricsTrackerProps) {
  const [weight, setWeight] = useState<number>(75);
  const [chest, setChest] = useState<number>(0);
  const [waist, setWaist] = useState<number>(0);
  const [arms, setArms] = useState<number>(0);
  const [legs, setLegs] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const newMetric: BodyMetricLog = {
      id: "metric_" + Date.now(),
      date,
      weight,
      chest: chest > 0 ? chest : undefined,
      waist: waist > 0 ? waist : undefined,
      arms: arms > 0 ? arms : undefined,
      legs: legs > 0 ? legs : undefined,
    };

    onAddMetric(newMetric);
    // Reset fields
    setChest(0);
    setWaist(0);
    setArms(0);
    setLegs(0);
  };

  // Quick stats calculations
  const sortedMetrics = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const initialWeight = sortedMetrics.length > 0 ? sortedMetrics[0].weight : 0;
  const currentWeight = sortedMetrics.length > 0 ? sortedMetrics[sortedMetrics.length - 1].weight : 0;
  const weightChange = currentWeight && initialWeight ? (currentWeight - initialWeight).toFixed(1) : "0.0";

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-white">
          Medidas Corporales y Peso
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Registra tu progreso físico de peso y perímetros para hacer comparativas mensuales precisas.
        </p>
      </div>

      {/* Quick stats banner */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-red-500 font-bold block uppercase font-mono">Peso inicial</span>
              <span className="text-lg font-black text-white font-mono">{initialWeight} kg</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-red-500 font-bold block uppercase font-mono">Peso actual</span>
              <span className="text-lg font-black text-white font-mono">{currentWeight} kg</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-red-500 font-bold block uppercase font-mono">Cambio total</span>
              <span className={`text-lg font-black font-mono ${Number(weightChange) < 0 ? 'text-emerald-400' : Number(weightChange) > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {Number(weightChange) > 0 ? `+${weightChange}` : weightChange} kg
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="md:col-span-5 bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl space-y-5">
          <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
            <Plus className="w-4 h-4 text-red-500" />
            Registrar Nuevas Medidas
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">
                Fecha del registro
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">
                Peso Corporal (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                required
              />
            </div>

            <div className="border-t border-zinc-850 pt-3">
              <span className="text-xs font-bold text-red-500 block mb-2 font-mono">PERÍMETROS (OPCIONAL)</span>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Pecho (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="No registrar"
                    value={chest || ""}
                    onChange={(e) => setChest(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-800 bg-black text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="No registrar"
                    value={waist || ""}
                    onChange={(e) => setWaist(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-800 bg-black text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Brazos (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="No registrar"
                    value={arms || ""}
                    onChange={(e) => setArms(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-800 bg-black text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Piernas (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="No registrar"
                    value={legs || ""}
                    onChange={(e) => setLegs(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-800 bg-black text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-md shadow-red-600/20 cursor-pointer transition-colors"
            >
              Guardar Medidas
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl">
            <h3 className="text-base font-black text-white mb-4 uppercase">
              Historial de Mediciones
            </h3>

            {metrics.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-500" />
                <p className="text-sm font-semibold">No hay registros de peso ni perímetros guardados aún.</p>
                <p className="text-xs mt-1">Registra tu peso arriba para comenzar el seguimiento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 font-mono">
                    <tr>
                      <th className="py-2.5">Fecha</th>
                      <th className="py-2.5">Peso</th>
                      <th className="py-2.5">Cintura</th>
                      <th className="py-2.5">Pecho</th>
                      <th className="py-2.5">Brazos</th>
                      <th className="py-2.5">Piernas</th>
                      <th className="py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {[...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/50">
                        <td className="py-3 font-mono font-bold text-zinc-400">{m.date}</td>
                        <td className="py-3 font-black text-red-400 font-mono">{m.weight} kg</td>
                        <td className="py-3 text-zinc-300 font-medium font-mono">{m.waist ? `${m.waist} cm` : "—"}</td>
                        <td className="py-3 text-zinc-300 font-medium font-mono">{m.chest ? `${m.chest} cm` : "—"}</td>
                        <td className="py-3 text-zinc-300 font-medium font-mono">{m.arms ? `${m.arms} cm` : "—"}</td>
                        <td className="py-3 text-zinc-300 font-medium font-mono">{m.legs ? `${m.legs} cm` : "—"}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onDeleteMetric(m.id)}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
