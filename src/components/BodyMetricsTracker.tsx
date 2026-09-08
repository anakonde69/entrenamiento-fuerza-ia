import { useState, FormEvent, useMemo } from "react";
import { Scale, Plus, Calendar, Trash2, TrendingDown, LineChart as LineChartIcon } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
  const sortedMetrics = useMemo(
    () => [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [metrics]
  );
  const initialWeight = sortedMetrics.length > 0 ? sortedMetrics[0].weight : 0;
  const currentWeight = sortedMetrics.length > 0 ? sortedMetrics[sortedMetrics.length - 1].weight : 0;
  const weightChange = currentWeight && initialWeight ? (currentWeight - initialWeight).toFixed(1) : "0.0";

  const formatDateLabel = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}`;
  };

  const weightChartData = useMemo(
    () =>
      sortedMetrics.map((metric) => ({
        date: metric.date,
        peso: metric.weight,
      })),
    [sortedMetrics]
  );

  const measurementsChartData = useMemo(
    () =>
      sortedMetrics
        .filter((metric) => metric.chest || metric.waist || metric.arms || metric.legs)
        .map((metric) => ({
          date: metric.date,
          pecho: metric.chest ?? null,
          cintura: metric.waist ?? null,
          brazos: metric.arms ?? null,
          piernas: metric.legs ?? null,
        })),
    [sortedMetrics]
  );

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

        {/* List + Charts Column */}
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

          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-black text-white mb-1 uppercase flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-red-500" />
                Evolución
              </h3>
              <p className="text-xs text-zinc-500">
                Visualiza cómo cambian tu peso y tus perímetros a lo largo del tiempo.
              </p>
            </div>

            {metrics.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                <p className="text-sm">Necesitas registros para mostrar las gráficas de evolución.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest font-mono mb-2">
                    Evolución de peso (kg)
                  </h4>
                  <div className="h-60 w-full rounded-xl border border-zinc-900 bg-black/40 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          minTickGap={20}
                          tickFormatter={formatDateLabel}
                          style={{ fontSize: "10px", fill: "#71717a" }}
                        />
                        <YAxis tickLine={false} unit="kg" style={{ fontSize: "10px", fill: "#71717a" }} />
                        <Tooltip
                          labelFormatter={(label) => `Fecha: ${label}`}
                          formatter={(value) => [`${value} kg`, "Peso"]}
                          contentStyle={{ borderRadius: "12px", border: "1px solid #27272a", backgroundColor: "#09090b", color: "#fff" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="peso"
                          name="Peso"
                          stroke="#dc2626"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#dc2626" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest font-mono mb-2">
                    Evolución de medidas corporales (cm)
                  </h4>
                  {measurementsChartData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                      <p className="text-sm px-4 text-center">
                        Aún no hay perímetros registrados. Añade pecho, cintura, brazos o piernas para ver esta gráfica.
                      </p>
                    </div>
                  ) : (
                    <div className="h-72 w-full rounded-xl border border-zinc-900 bg-black/40 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={measurementsChartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            minTickGap={20}
                            tickFormatter={formatDateLabel}
                            style={{ fontSize: "10px", fill: "#71717a" }}
                          />
                          <YAxis tickLine={false} unit="cm" style={{ fontSize: "10px", fill: "#71717a" }} />
                          <Tooltip
                            labelFormatter={(label) => `Fecha: ${label}`}
                            formatter={(value, name) => {
                              if (value === null || value === undefined) return ["Sin dato", name];
                              return [`${value} cm`, name];
                            }}
                            contentStyle={{ borderRadius: "12px", border: "1px solid #27272a", backgroundColor: "#09090b", color: "#fff" }}
                          />
                          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                          <Line type="monotone" dataKey="pecho" name="Pecho" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#dc2626" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="brazos" name="Brazos" stroke="#f87171" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="piernas" name="Piernas" stroke="#b91c1c" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
