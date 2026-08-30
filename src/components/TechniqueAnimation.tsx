import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface TechniqueAnimationProps {
  type: 'squat' | 'bench_press' | 'deadlift' | 'bicep_curl' | 'shoulder_press' | 'push_up' | 'pull_up' | 'lunge' | 'generic';
}

const imageMap: Record<string, string[]> = {
  squat: [
    "/src/assets/images/squat_exercise_top_1784649405135.jpg",
    "/src/assets/images/squat_mid_down_1784651019687.jpg",
    "/src/assets/images/squat_exercise_1784649291664.jpg",
    "/src/assets/images/squat_mid_up_1784651035671.jpg",
  ],
  bench_press: [
    "/src/assets/images/bench_press_exercise_1784649306328.jpg",
    "/src/assets/images/bench_press_mid_down_1784651050971.jpg",
    "/src/assets/images/bench_press_exercise_bottom_1784649421618.jpg",
    "/src/assets/images/bench_press_mid_up_1784651063638.jpg",
  ],
  deadlift: [
    "/src/assets/images/deadlift_exercise_1784649320600.jpg",
    "/src/assets/images/deadlift_mid_down_1784651076448.jpg",
    "/src/assets/images/deadlift_exercise_bottom_1784649434694.jpg",
    "/src/assets/images/deadlift_mid_up_1784651090226.jpg",
  ],
  bicep_curl: [
    "/src/assets/images/bicep_curl_exercise_bottom_1784649447779.jpg",
    "/src/assets/images/bicep_curl_mid_1784651103738.jpg",
    "/src/assets/images/bicep_curl_peak_1784651118135.jpg",
    "/src/assets/images/bicep_curl_exercise_1784649332970.jpg",
  ],
  shoulder_press: [
    "/src/assets/images/shoulder_press_exercise_bottom_1784649461060.jpg",
    "/src/assets/images/shoulder_press_mid_down_1784651136998.jpg",
    "/src/assets/images/shoulder_press_exercise_1784649346655.jpg",
    "/src/assets/images/shoulder_press_mid_up_1784651150901.jpg",
  ],
  push_up: [
    "/src/assets/images/push_up_exercise_top_1784649473811.jpg",
    "/src/assets/images/push_up_mid_down_1784651164849.jpg",
    "/src/assets/images/push_up_exercise_1784649358924.jpg",
    "/src/assets/images/push_up_mid_up_1784651177051.jpg",
  ],
  pull_up: [
    "/src/assets/images/pull_up_exercise_bottom_1784649486730.jpg",
    "/src/assets/images/pull_up_mid_up_1784651192124.jpg",
    "/src/assets/images/pull_up_exercise_1784649372035.jpg",
    "/src/assets/images/pull_up_mid_down_1784651205687.jpg",
  ],
  lunge: [
    "/src/assets/images/lunge_exercise_standing_1784649500474.jpg",
    "/src/assets/images/lunge_mid_down_1784651219974.jpg",
    "/src/assets/images/lunge_exercise_1784649386388.jpg",
    "/src/assets/images/lunge_exercise_standing_1784649500474.jpg",
  ],
  generic: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop"
  ]
};

const titleMap: Record<string, string> = {
  squat: "Sentadilla",
  bench_press: "Press de Banca",
  deadlift: "Peso Muerto",
  bicep_curl: "Curl de Bíceps",
  shoulder_press: "Press Militar",
  push_up: "Flexiones",
  pull_up: "Dominadas",
  lunge: "Zancadas",
  generic: "Ejercicio General"
};

const tipMap: Record<string, string> = {
  squat: "Baja controlando, rompe el paralelo y mantén el peso en el centro del pie.",
  bench_press: "Retrae las escápulas, apoya firmemente los pies y baja la barra al pecho.",
  deadlift: "Mantén la espalda recta y el abdomen tenso. Empuja el suelo con las piernas.",
  bicep_curl: "Mantén los codos pegados a las costillas y evita el impulso con la espalda.",
  shoulder_press: "Activa el core, empuja verticalmente y bloquea los brazos arriba.",
  push_up: "Mantén el cuerpo en línea recta y los codos a unos 45° de tu torso.",
  pull_up: "Tracciona llevando los codos hacia abajo y atrás, pasando la barbilla sobre la barra.",
  lunge: "Baja verticalmente, que tu rodilla trasera casi roce el suelo. Torso firme.",
  generic: "Mantén una postura firme, controla el peso en todo momento y respira de forma constante."
};

export default function TechniqueAnimation({ type }: TechniqueAnimationProps) {
  const images = imageMap[type] || imageMap.generic;
  const [currentIndex, setCurrentIndex] = useState(0);
  const exerciseName = titleMap[type] || titleMap.generic;
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(exerciseName + ' ejercicio')}`;

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-black rounded-2xl border border-zinc-900 shadow-inner w-full relative overflow-hidden group">
      <div className="absolute top-5 left-5 z-10 text-[10px] font-mono text-red-500 font-bold uppercase tracking-widest bg-zinc-950/90 backdrop-blur-md border border-red-500/20 px-2 py-1 rounded flex items-center justify-between">
        Técnica: {exerciseName}
      </div>
      <a 
        href={googleImagesUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute top-4 right-5 z-10 p-1.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-full text-zinc-300 hover:text-red-500 hover:border-red-500/50 transition-colors"
        title="Buscar imágenes en Google"
      >
        <Search className="w-3.5 h-3.5" />
      </a>
      
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950">
        {images[currentIndex] ? (
          <img 
            src={images[currentIndex]} 
            alt={`${exerciseName} phase ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 text-xs font-mono">
            {exerciseName}
          </div>
        )}
        
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-red-600' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="text-[10px] sm:text-xs text-zinc-400 mt-3 text-center font-medium max-w-[90%] leading-tight">
        {tipMap[type] || tipMap.generic}
      </div>
    </div>
  );
}
