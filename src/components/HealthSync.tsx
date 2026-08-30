import { useState, useEffect } from "react";
import { Heart, RefreshCw, Smartphone, Check, ShieldAlert, Wifi } from "lucide-react";
import { safeSetItem, safeGetItem } from "../lib/storage";

interface SyncLog {
  time: string;
  service: 'Google Fit' | 'Apple Health';
  message: string;
  status: 'success' | 'info' | 'error';
}

export default function HealthSync() {
  const [googleFitConnected, setGoogleFitConnected] = useState<boolean>(() => {
    return safeGetItem("sync_gfit") === "true";
  });
  const [appleHealthConnected, setAppleHealthConnected] = useState<boolean>(() => {
    return safeGetItem("sync_ahealth") === "true";
  });

  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    safeSetItem("sync_gfit", String(googleFitConnected));
  }, [googleFitConnected]);

  useEffect(() => {
    safeSetItem("sync_ahealth", String(appleHealthConnected));
  }, [appleHealthConnected]);

  const addLog = (service: 'Google Fit' | 'Apple Health', message: string, status: 'success' | 'info' | 'error') => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { time: timeStr, service, message, status },
      ...prev.slice(0, 19), // Max 20 logs
    ]);
  };

  const handleSyncAll = () => {
    if (!googleFitConnected && !appleHealthConnected) {
      addLog("Google Fit", "Error: Por favor conecta al menos un servicio de salud para iniciar la sincronización.", "error");
      return;
    }

    setSyncing(true);
    
    setTimeout(() => {
      if (googleFitConnected) {
        addLog(
          "Google Fit", 
          `Sincronización manual completada. Enviados entrenamientos de fuerza, macros y calorías quemadas (estimación: 420 kcal).`, 
          "success"
        );
      }
      if (appleHealthConnected) {
        addLog(
          "Apple Health", 
          `Sincronización manual completada. Sincronizado peso corporal de ${localStorage.getItem("user_profile") ? JSON.parse(localStorage.getItem("user_profile")!).weight : 75} kg y entrenamientos musculares.`, 
          "success"
        );
      }
      setSyncing(false);
    }, 1500);
  };

  // Simulates automatic sync when toggling on
  const handleToggleFit = () => {
    const nextVal = !googleFitConnected;
    setGoogleFitConnected(nextVal);
    if (nextVal) {
      addLog("Google Fit", "Conexión autorizada por el usuario. Iniciando sincronización de base de datos...", "info");
      setTimeout(() => {
        addLog("Google Fit", "Sincronizado historial de entrenamientos y ritmo cardíaco estimado.", "success");
      }, 1000);
    } else {
      addLog("Google Fit", "Desvinculado del perfil de Google Fit.", "info");
    }
  };

  const handleToggleApple = () => {
    const nextVal = !appleHealthConnected;
    setAppleHealthConnected(nextVal);
    if (nextVal) {
      addLog("Apple Health", "Autorizando permisos en Apple HealthKit...", "info");
      setTimeout(() => {
        addLog("Apple Health", "Sincronizado peso, grasa corporal y métricas de levantamientos correctamente.", "success");
      }, 1000);
    } else {
      addLog("Apple Health", "Desvinculado de Apple HealthKit.", "info");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      
      {/* Title */}
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-white">
          Sincronización de Salud
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Integra tu rutina y progresos de peso de forma fluida con las aplicaciones Google Fit y Apple Health.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Toggle Controls (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 font-mono">
              Servicios Disponibles
            </h3>

            {/* Google Fit Card */}
            <div className={`p-4 rounded-xl border transition-all flex justify-between items-center ${googleFitConnected ? 'bg-red-600/10 border-red-500/20' : 'bg-black border-zinc-900'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-lg">
                  G
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-200 block">Google Fit</span>
                  <span className={`text-[10px] block ${googleFitConnected ? 'text-red-400 font-semibold' : 'text-zinc-500'}`}>{googleFitConnected ? 'Conectado y listo' : 'Desvinculado'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleFit}
                className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${googleFitConnected ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800' : 'bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-600/20'}`}
              >
                {googleFitConnected ? 'Desconectar' : 'Vincular'}
              </button>
            </div>

            {/* Apple Health Card */}
            <div className={`p-4 rounded-xl border transition-all flex justify-between items-center ${appleHealthConnected ? 'bg-red-600/10 border-red-500/20' : 'bg-black border-zinc-900'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-lg">
                  
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-200 block">Apple Health</span>
                  <span className={`text-[10px] block ${appleHealthConnected ? 'text-red-400 font-semibold' : 'text-zinc-500'}`}>{appleHealthConnected ? 'Conectado y listo' : 'Desvinculado'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleApple}
                className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${appleHealthConnected ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800' : 'bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-600/20'}`}
              >
                {appleHealthConnected ? 'Desconectar' : 'Vincular'}
              </button>
            </div>

            {/* Trigger Manual Sync */}
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="w-full mt-2 py-3 bg-red-600 hover:bg-red-500 text-white disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl text-sm font-black uppercase tracking-wider shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Datos Ahora'}
            </button>
          </div>

          <div className="bg-black p-4 rounded-2xl border border-zinc-900 text-xs text-zinc-400 flex gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <strong>Nota sobre la Sincronización Web:</strong> Las integraciones nativas de Google Fit y Apple HealthKit requieren el entorno de aplicaciones nativas (iOS/Android). En este visor web, simulamos la sincronización de manera interactiva mostrando los logs que se emitirían en tiempo real al conectarse con el kit de desarrollo.
            </div>
          </div>
        </div>

        {/* Sync Console Logs (7 cols) */}
        <div className="md:col-span-7 bg-zinc-950 text-zinc-100 rounded-2xl p-5 shadow-xl border border-zinc-900 font-mono text-xs space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold tracking-wider text-zinc-200 uppercase">Consola de Sincronización</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors font-bold cursor-pointer uppercase"
            >
              Limpiar logs
            </button>
          </div>

          <div className="h-72 overflow-y-auto space-y-2.5 pr-2 scrolling">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-20 text-center font-normal">
                <Wifi className="w-8 h-8 mb-2 opacity-30 text-zinc-500" />
                <span>Consola en espera...</span>
                <span className="text-[10px] mt-1">Activa un servicio o realiza una sincronización para emitir registros.</span>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-500">[{log.time}]</span>
                    <span className="font-semibold text-red-400">{log.service}</span>
                    <span className={`px-1.5 py-0.2 rounded-sm text-[8px] font-bold ${
                      log.status === 'success' ? 'bg-red-950 text-red-300 border border-red-900/50' :
                      log.status === 'error' ? 'bg-red-950 text-red-400 border border-red-900/50' : 'bg-zinc-900 text-zinc-400'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-300 pl-1">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
