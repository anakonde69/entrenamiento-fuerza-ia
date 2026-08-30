import { useState, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar 
} from "recharts";
import { TrendingUp, Award, Activity, Sparkles, Scale } from "lucide-react";
import { WorkoutLog, BodyMetricLog } from "../types";

interface ProgressStatsProps {
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetricLog[];
}

export default function ProgressStats({ workoutLogs, bodyMetrics }: ProgressStatsProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  // 1. Extract all unique exercises logged
  const loggedExercises = useMemo(() => {
    const list = new Map<string, string>(); // id -> name
    workoutLogs.forEach((log) => {
      list.set(log.exerciseId, log.exerciseName);
    });
    return Array.from(list.entries()).map(([id, name]) => ({ id, name }));
  }, [workoutLogs]);

  // Set initial selected exercise once logs exist
  if (!selectedExercise && loggedExercises.length > 0) {
    setSelectedExercise(loggedExercises[0].id);
  }

  // 2. Format exercise history data for strength chart (Max weight lifted per date)
  const strengthChartData = useMemo(() => {
    if (!selectedExercise) return [];

    const exerciseLogs = workoutLogs.filter((log) => log.exerciseId === selectedExercise);
    
    // Group by date, get max weight
    const grouped = new Map<string, number>();
    exerciseLogs.forEach((log) => {
      const maxWeight = Math.max(...log.sets.map((s) => s.weight || 0), 0);
      const existing = grouped.get(log.date) || 0;
      if (maxWeight > existing) {
        grouped.set(log.date, maxWeight);
      }
    });

    // Convert to sorted array
    return Array.from(grouped.entries())
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workoutLogs, selectedExercise]);

  // 3. Format body weight history for AreaChart
  const weightChartData = useMemo(() => {
    return [...bodyMetrics]
      .map((m) => ({
        date: m.date,
        peso: m.weight,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bodyMetrics]);

  // 4. Monthly weight comparative data
  const monthlyComparisonData = useMemo(() => {
    const monthlyGroups: { [month: string]: number[] } = {};
    bodyMetrics.forEach((m) => {
      const month = m.date.substring(0, 7); // "YYYY-MM"
      if (!monthlyGroups[month]) monthlyGroups[month] = [];
      monthlyGroups[month].push(m.weight);
    });

    return Object.entries(monthlyGroups)
      .map(([month, weights]) => {
        const avg = weights.reduce((acc, val) => acc + val, 0) / weights.length;
        return {
          mes: month,
          PesoPromedio: parseFloat(avg.toFixed(1)),
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [bodyMetrics]);

  // 5. Body measurements trends chart
  const measurementsChartData = useMemo(() => {
    return [...bodyMetrics]
      .filter((m) => m.chest || m.waist || m.arms || m.legs)
      .map((m) => ({
        date: m.date,
        cintura: m.waist || 0,
        pecho: m.chest || 0,
        brazo: m.arms || 0,
        pierna: m.legs || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bodyMetrics]);

  const selectedExerciseName = loggedExercises.find((e) => e.id === selectedExercise)?.name || "Ejercicio";

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-10">
      
      {/* Intro Header */}
      <div className="text-center">
        <h2 className="text-3xl font-black text-white flex items-center justify-center gap-2 uppercase">
          <Activity className="w-8 h-8 text-red-500" />
          Análisis de Progreso
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Visualiza la evolución de tus cargas máximas, fluctuaciones de peso y perímetros musculares.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Row 1: Strength progression */}
        <div className="lg:col-span-8 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase">
                <Award className="w-5 h-5 text-red-500" />
                Progreso de Carga Máxima (1RM Estimado)
              </h3>
              <p className="text-xs text-zinc-500">Peso máximo absoluto levantado por sesión.</p>
            </div>

            {loggedExercises.length > 0 && (
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="px-3.5 py-1.5 text-xs rounded-xl border border-zinc-800 bg-black text-white font-semibold focus:outline-none focus:border-red-500 cursor-pointer font-mono"
              >
                {loggedExercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {workoutLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
              <Sparkles className="w-10 h-10 text-red-500 opacity-30 mb-2 animate-pulse" />
              <p className="text-sm">Registra entrenamientos para ver tu evolución de fuerza.</p>
            </div>
          ) : strengthChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-zinc-500">
              <p className="text-sm">No hay series completadas registradas para este ejercicio.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px', fill: '#71717a' }} />
                  <YAxis tickLine={false} unit="kg" style={{ fontSize: '10px', fill: '#71717a' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    name={selectedExerciseName} 
                    stroke="#dc2626" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#dc2626' }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Row 1, Col 2: Quick Metrics Widget */}
        <div className="lg:col-span-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-red-500 mb-4 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4" />
              Resumen de Logros
            </h3>
            <div className="space-y-4">
              <div className="p-3.5 bg-red-600/10 rounded-xl border border-red-500/20">
                <span className="text-xs text-zinc-400 block font-bold">Sesiones completadas</span>
                <span className="text-2xl font-black text-white font-mono">
                  {new Set(workoutLogs.map((log) => log.date)).size}
                </span>
              </div>

              <div className="p-3.5 bg-red-600/10 rounded-xl border border-red-500/20">
                <span className="text-xs text-zinc-400 block font-bold">Ejercicios únicos ejecutados</span>
                <span className="text-2xl font-black text-white font-mono">
                  {loggedExercises.length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-medium leading-relaxed border-t border-zinc-900 pt-4 mt-6">
            💡 <strong>Consejo IA:</strong> Incrementa un 2-5% del peso total de tus series una vez alcances de manera holgada las repeticiones objetivo (Principio de Sobrecarga Progresiva).
          </div>
        </div>

        {/* Row 2: Weight chart over time (6 cols) */}
        <div className="lg:col-span-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase">
              <Scale className="w-5 h-5 text-red-500" />
              Evolución de Peso Diario
            </h3>
            <p className="text-xs text-zinc-500">Variación del peso corporal registrado.</p>
          </div>

          {bodyMetrics.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
              <p className="text-sm">Registra tu peso en la sección de medidas corporales.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px', fill: '#71717a' }} />
                  <YAxis tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} unit="kg" style={{ fontSize: '10px', fill: '#71717a' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#fff' }} />
                  <Area 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="#dc2626" 
                    fillOpacity={1} 
                    fill="url(#weightGrad)" 
                    strokeWidth={2.5} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Row 2, Col 2: Comparative monthly weight (6 cols) */}
        <div className="lg:col-span-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Gráfica Comparativa Mensual de Peso
            </h3>
            <p className="text-xs text-zinc-500">Peso corporal promedio para evaluar tendencias limpias.</p>
          </div>

          {bodyMetrics.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
              <p className="text-sm">Registra tu peso en la sección de medidas corporales.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="mes" tickLine={false} style={{ fontSize: '10px', fill: '#71717a' }} />
                  <YAxis tickLine={false} domain={['dataMin - 5', 'dataMax + 2']} unit="kg" style={{ fontSize: '10px', fill: '#71717a' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#fff' }} />
                  <Bar dataKey="PesoPromedio" name="Peso Promedio" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Row 3: Perimeters line trends (12 cols) */}
        <div className="lg:col-span-12 bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase">
              <Activity className="w-5 h-5 text-red-500" />
              Evolución de Medidas Corporales (cm)
            </h3>
            <p className="text-xs text-zinc-500">Tendencia mensual de tus perímetros clave.</p>
          </div>

          {measurementsChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-900 rounded-xl">
              <p className="text-sm">Completa registros con medidas opcionales (brazo, cintura...) para trazar tendencias.</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={measurementsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px', fill: '#71717a' }} />
                  <YAxis tickLine={false} style={{ fontSize: '10px', fill: '#71717a' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#fff' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="cintura" stroke="#ef4444" name="Cintura" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pecho" stroke="#dc2626" name="Pecho" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="brazo" stroke="#f87171" name="Brazos" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pierna" stroke="#b91c1c" name="Piernas" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
