import { useState, FormEvent, useMemo } from "react";
import { Scale, Plus, Calendar, Trash2, TrendingDown, LineChart as LineChartIcon, Pencil, X } from "lucide-react";
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
  onEditMetric: (metric: BodyMetricLog) => void;
}

export default function BodyMetricsTracker({ metrics, onAddMetric, onDeleteMetric, onEditMetric }: BodyMetricsTrackerProps) {
  const [weight, setWeight] = useState<number>(75);
  const [chest, setChest] = useState<number>(0);
  const [waist, setWaist] = useState<number>(0);
  const [hip, setHip] = useState<number>(0);
  const [arms, setArms] = useState<number>(0);
  const [legs, setLegs] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Edición
  const [editingMetric, setEditingMetric] = useState<BodyMetricLog | null>(null);

  const startEdit = (m: BodyMetricLog) => {
    setEditingMetric(m);
    setDate(m.date);
    setWeight(m.weight);
    setChest(m.chest ?? 0);
    setWaist(m.waist ?? 0);
    setHip(m.hip ?? 0);
    setArms(m.arms ?? 0);
    setLegs(m.legs ?? 0);
    setTimeout(() => {
      document.getElementById("metrics-form-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const cancelEdit = () => {
    setEditingMetric(null);
    setChest(0);
    setWaist(0);
    setHip(0);
    setArms(0);
    setLegs(0);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (editingMetric) {
      const updated: BodyMetricLog = {
        ...editingMetric,
        date,
        weight,
        chest: chest > 0 ? chest : undefined,
        waist: waist > 0 ? waist : undefined,
        hip: hip > 0 ? hip : undefined,
        arms: arms > 0 ? arms : undefined,
        legs: legs > 0 ? legs : undefined,
      };
      onEditMetric(updated);
      setEditingMetric(null);
    } else {
      const newMetric: BodyMetricLog = {
        id: "metric_" + Date.now(),
        date,
        weight,
        chest: chest > 0 ? chest : undefined,
        waist: waist > 0 ? waist : undefined,
        hip: hip > 0 ? hip : undefined,
        arms: arms > 0 ? arms : undefined,
        legs: legs > 0 ? legs : undefined,
      };
      onAddMetric(newMetric);
    }

    setChest(0);
    setWaist(0);
    setHip(0);
    setArms(0);
    setLegs(0);
  };

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
    () => sortedMetrics.map((metric) => ({ date: metric.date, peso: metric.weight })),
    [sortedMetrics]
  );

  const measurementsChartData = useMemo(
    () =>
      sortedMetrics
        .filter((metric) => metric.chest || metric.waist || metric.hip || metric.arms || metric.legs)
        .map((metric) => ({
          date: metric.date,
          pecho: metric.chest ?? null,
          cintura: metric.waist ?? null,
          cadera: metric.hip ?? null,
          brazos: metric.arms ?? null,
          piernas: metric.legs ?? null,
        })),
    [sortedMetrics]
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-white">Medidas Corporales y Peso</h2>
        <p className="mt-2 text-sm text-slate-400">
          Registra tu progreso físico de peso y perímetros para hacer comparativas mensuales precisas.
        </p>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white"><Scale className="w-5 h-5" /></div>
            <div>
              <span className="text-xs text-red-500 font-bold block uppercase font-mono">Peso inicial</span>
              <span className="text-lg font-black text-white font-mono">{initialWeight} kg</span>
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white"><Scale className="w-5 h-5" /></div>
            <div>
              <span className="text-xs text-red-500 font-bold block uppercase font-mono">Peso actual</span>
              <span className="text-lg font-black text-white font-mono">{currentWeight} kg</span>
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
            <div className="p-3 rounded-lg bg-red-600 text-white"><TrendingDown className="w-5 h-5" /></div>
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
        {/* Formulario */}
        <div id="metrics-form-top" className="md:col-span-5 bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl space-y-5">
          <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
            {editingMetric ? (
              <><Pencil className="w-4 h-4 text-red-500" />Editando: {editingMetric.date}</>
            ) : (
              <><Plus className="w-4 h-4 text-red-500" />Registrar Nuevas Medidas</>
            )}
          </h3>

          {editingMetric && (
            <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-xl px-4 py-2.5">
              <Pencil className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300 font-mono">Modifica los campos y pulsa Actualizar.</span>
              <button type="button" onClick={cancelEdit} className="ml-auto text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer" title="Cancelar edición">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Fecha del registro</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Peso Corporal (kg)</label>
              <input type="number" step="0.1" min="30" max="250" value={weight} onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-800 bg-black text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono" required />
            </div>

            <div className="border-t border-zinc-850 pt-3">
              <span className="text-xs font-bold text-red-500 block mb-2 font-mono">PERÍMETROS (OPCIONAL)</span>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { label: "Pecho (cm)", value: chest, set: setChest, step: "0.5" },
                  { label: "Cintura (cm)", value: waist, set: setWaist, step: "0.5" },
                  { label: "Cadera (cm)", value: hip, set: setHip, step: "0.5" },
                  { label: "Brazos (cm)", value: arms, set: setArms, step: "0.1" },
                  { label: "Piernas (cm)", value: legs, set: setLegs, step: "0.5" },
                ].map(({ label, value, set, step }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
                    <input type="number" step={step} min="0" placeholder="No registrar"
                      value={value || ""}
                      onChange={(e) => set(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-800 bg-black text-white focus:outline-none focus:border-red-500 font-mono" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button type="submit"
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-md shadow-red-600/20 cursor-pointer transition-colors">
                {editingMetric ? "Actualizar Medida" : "Guardar Medidas"}
              </button>
              {editingMetric && (
                <button type="button" onClick={cancelEdit}
                  className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Historial + Gráficas */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl">
            <h3 className="text-base font-black text-white mb-5 uppercase">Historial de Mediciones</h3>

            {metrics.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-500" />
                <p className="text-sm font-semibold">No hay registros guardados aún.</p>
                <p className="text-xs mt-1">Registra tu peso arriba para comenzar el seguimiento.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {[...metrics]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((m) => {
                    const isBeingEdited = editingMetric?.id === m.id;
                    const perimeters = [
                      { label: "Pecho", value: m.chest },
                      { label: "Cintura", value: m.waist },
                      { label: "Cadera", value: m.hip },
                      { label: "Brazos", value: m.arms },
                      { label: "Piernas", value: m.legs },
                    ].filter((p) => p.value !== undefined && p.value !== null && p.value > 0);

                    return (
                      <div key={m.id}
                        className={`rounded-xl border p-4 transition-colors ${isBeingEdited ? "border-red-500/60 bg-red-600/5" : "border-zinc-800 bg-black/40 hover:border-red-600/40"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg border ${isBeingEdited ? 'bg-red-600/30 border-red-600/40' : 'bg-red-600/15 border-red-600/20'}`}>
                              <Calendar className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Fecha</span>
                              <span className="block text-sm font-bold text-zinc-200 font-mono">{m.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Peso</span>
                              <span className="block text-lg font-black text-red-400 font-mono leading-tight">{m.weight} kg</span>
                            </div>
                            <button
                              onClick={() => isBeingEdited ? cancelEdit() : startEdit(m)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${isBeingEdited ? "text-red-400 bg-red-600/20 hover:bg-red-600/30" : "text-zinc-500 hover:text-red-400 hover:bg-red-600/10"}`}
                              title={isBeingEdited ? "Cancelar edición" : "Editar registro"}>
                              {isBeingEdited ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                            </button>
                            <button onClick={() => onDeleteMetric(m.id)}
                              className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-600/10 transition-colors cursor-pointer" title="Eliminar registro">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {perimeters.length > 0 && (
                          <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {perimeters.map((p) => (
                              <div key={p.label} className="rounded-lg bg-zinc-900/60 px-3 py-2 border border-zinc-800/60">
                                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">{p.label}</span>
                                <span className="block text-sm font-bold text-zinc-200 font-mono">{p.value} cm</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-black text-white mb-1 uppercase flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-red-500" />Evolución
              </h3>
              <p className="text-xs text-zinc-500">Visualiza cómo cambian tu peso y tus perímetros a lo largo del tiempo.</p>
            </div>

            {metrics.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                <p className="text-sm">Necesitas registros para mostrar las gráficas de evolución.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest font-mono mb-2">Evolución de peso (kg)</h4>
                  <div className="h-60 w-full rounded-xl border border-zinc-900 bg-black/40 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis dataKey="date" tickLine={false} minTickGap={20} tickFormatter={formatDateLabel} style={{ fontSize: "10px", fill: "#71717a" }} />
                        <YAxis tickLine={false} unit="kg" style={{ fontSize: "10px", fill: "#71717a" }} />
                        <Tooltip labelFormatter={(label) => `Fecha: ${label}`} formatter={(value) => [`${value} kg`, "Peso"]}
                          contentStyle={{ borderRadius: "12px", border: "1px solid #27272a", backgroundColor: "#09090b", color: "#fff" }} />
                        <Line type="monotone" dataKey="peso" name="Peso" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: "#dc2626" }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest font-mono mb-2">Evolución de medidas corporales (cm)</h4>
                  {measurementsChartData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
                      <p className="text-sm px-4 text-center">Aún no hay perímetros registrados.</p>
                    </div>
                  ) : (
                    <div className="h-72 w-full rounded-xl border border-zinc-900 bg-black/40 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={measurementsChartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                          <XAxis dataKey="date" tickLine={false} minTickGap={20} tickFormatter={formatDateLabel} style={{ fontSize: "10px", fill: "#71717a" }} />
                          <YAxis tickLine={false} unit="cm" style={{ fontSize: "10px", fill: "#71717a" }} />
                          <Tooltip labelFormatter={(label) => `Fecha: ${label}`}
                            formatter={(value, name) => value === null || value === undefined ? ["Sin dato", name] : [`${value} cm`, name]}
                            contentStyle={{ borderRadius: "12px", border: "1px solid #27272a", backgroundColor: "#09090b", color: "#fff" }} />
                          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                          <Line type="monotone" dataKey="pecho" name="Pecho" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#dc2626" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                          <Line type="monotone" dataKey="cadera" name="Cadera" stroke="#fb7185" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
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
