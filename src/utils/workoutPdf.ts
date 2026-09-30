import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FreeWorkoutLog, MachineExercise } from "../types";

// Colores del tema (rojo/negro)
const RED: [number, number, number] = [220, 38, 38];
const DARK: [number, number, number] = [24, 24, 27];
const GRAY: [number, number, number] = [113, 113, 122];

/**
 * Detecta el formato de imagen a partir de un data URL.
 * jsPDF necesita saber si es JPEG, PNG, etc.
 */
function detectImageFormat(dataUrl: string): string {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  return "PNG";
}

/** Tipo de retorno unificado para ambos casos (data URL o HTMLImageElement) */
type LoadedImage = {
  imageData: string | HTMLImageElement;  // string = data URL, HTMLImageElement = imagen cargada
  width: number;
  height: number;
  format: string;
};

/**
 * Carga una imagen para incrustarla en jsPDF.
 * - Data URL (fotos del usuario en Firestore): usa el string directamente, sin canvas.
 * - URL http(s): carga como HTMLImageElement con crossOrigin="anonymous".
 *   jsPDF acepta HTMLImageElement nativamente y lo dibuja internamente en canvas.
 *   Como el servidor envía Access-Control-Allow-Origin: * (p.ej. Unsplash),
 *   el canvas NO queda "tainted" y la operación es segura.
 */
async function loadImageForPdf(src: string): Promise<LoadedImage | null> {
  if (!src || typeof src !== "string" || src.trim() === "") return null;

  // ── Caso 1: ya es un data URL ────────────────────────────────────────────────
  if (src.startsWith("data:")) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          imageData: src,
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
          format: detectImageFormat(src),
        });
      img.onerror = () => {
        console.warn("[PDF] Falló la carga de data URL, longitud:", src.length);
        resolve(null);
      };
      img.src = src;
    });
  }

  // ── Caso 2: URL http(s) — HTMLImageElement con crossOrigin ──────────────────
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({
        imageData: img,
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 300,
        format: "JPEG",
      });
    img.onerror = () => {
      console.warn("[PDF] Falló la carga de URL http:", src.substring(0, 80));
      resolve(null);
    };
    img.src = src;
  });
}

function formatTimeSecs(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Genera un PDF con el resumen de los entrenamientos de un día:
 * fecha, sesiones, y por cada ejercicio: foto de la máquina, series con
 * peso y repeticiones (o bloques de cardio). Todos los textos en español.
 *
 * @param dateLabel  Etiqueta legible de la fecha (p.ej. "lunes, 30 sept 2026")
 * @param logs       Registros de entrenamiento del día
 * @param machines   Lista completa de máquinas del usuario (para obtener imágenes por machineId)
 */
export async function generateDayWorkoutPdf(
  dateLabel: string,
  logs: FreeWorkoutLog[],
  machines: MachineExercise[] = []
): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 14;
  let y = 0;

  // ---- Cabecera ----
  pdf.setFillColor(DARK[0], DARK[1], DARK[2]);
  pdf.rect(0, 0, pageWidth, 30, "F");
  pdf.setFillColor(RED[0], RED[1], RED[2]);
  pdf.rect(0, 30, pageWidth, 1.5, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("XOPATS", marginX, 14);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(230, 230, 230);
  pdf.text("Resumen de Entrenamiento", marginX, 22);

  pdf.setFontSize(10);
  pdf.setTextColor(RED[0], RED[1], RED[2]);
  pdf.setFont("helvetica", "bold");
  pdf.text(dateLabel, pageWidth - marginX, 14, { align: "right" });

  y = 40;

  // ---- Resumen del día ----
  const totalDuration = logs.reduce((acc, l) => acc + (l.durationSeconds || 0), 0);
  const totalExercises = logs.reduce((acc, l) => acc + (l.exercises?.length || 0), 0);

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Sesiones: ${logs.length}   |   Ejercicios: ${totalExercises}   |   Tiempo total: ${formatTimeSecs(
      totalDuration
    )}`,
    marginX,
    y
  );
  y += 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 15) {
      pdf.addPage();
      y = 18;
    }
  };

  for (let s = 0; s < logs.length; s++) {
    const log = logs[s];

    ensureSpace(14);
    // Barra de sesión
    pdf.setFillColor(RED[0], RED[1], RED[2]);
    pdf.rect(marginX, y, pageWidth - marginX * 2, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(
      `Sesión ${s + 1}  ·  ${formatTimeSecs(log.durationSeconds || 0)}`,
      marginX + 2,
      y + 5.5
    );
    y += 12;

    const exercises = log.exercises || [];
    for (let e = 0; e < exercises.length; e++) {
      const ex = exercises[e];

      // Foto de la máquina
      // 1) Buscar imagen en el log (para URLs http externas que no se sanitizan)
      // 2) Si no hay, buscar en el catálogo de máquinas por machineId
      //    (las fotos subidas por el usuario se guardan en Firestore machines, no en el log)
      const logImgSrc =
        (ex.imageUrls && ex.imageUrls.length > 0 ? ex.imageUrls[0] : "") || ex.imageUrl || "";

      let machineImgSrc = "";
      if (ex.machineId) {
        const machine = machines.find((m) => m.id === ex.machineId);
        if (machine) {
          machineImgSrc =
            (machine.imageUrls && machine.imageUrls.length > 0 ? machine.imageUrls[0] : "") ||
            machine.imageUrl ||
            "";
        }
      }

      // Preferir la del catálogo de máquinas (más actualizada) sobre la del log
      const imgSrc = machineImgSrc || logImgSrc;

      // Diagnóstico en consola del navegador (abrir DevTools → Console para ver)
      console.log(`[PDF] Ejercicio ${e + 1}: "${ex.name}" | machineId="${ex.machineId}" | machines.length=${machines.length} | machineImgSrc="${machineImgSrc.substring(0, 60)}" | logImgSrc="${logImgSrc.substring(0, 60)}" | imgSrc="${imgSrc.substring(0, 60)}"`);

      let imgData: LoadedImage | null = null;
      if (imgSrc) {
        imgData = await loadImageForPdf(imgSrc);
        console.log(`[PDF]   → imagen cargada: ${imgData ? "SÍ" : "NO"}`);
      }

      const imgBoxW = 32;
      const imgBoxH = 24;
      ensureSpace(imgBoxH + 6);

      // Nombre del ejercicio
      pdf.setTextColor(20, 20, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      const nameX = imgData ? marginX + imgBoxW + 4 : marginX;
      pdf.text(`${e + 1}. ${ex.name || "Ejercicio"}`, nameX, y + 4);

      // Categoría / tipo
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
      const typeLabel = ex.isCardio ? "Cardio" : "Fuerza";
      pdf.text(typeLabel, nameX, y + 9);

      const tableStartY = y + 12;

      // Insertar imagen
      if (imgData) {
        try {
          // Mantener proporción dentro de la caja
          const ratio = (imgData.width / imgData.height) || 1;
          let drawW = imgBoxW;
          let drawH = imgBoxW / ratio;
          if (drawH > imgBoxH) {
            drawH = imgBoxH;
            drawW = imgBoxH * ratio;
          }
          // imageData puede ser un string (data URL) o un HTMLImageElement
          // jsPDF acepta ambos en addImage()
          pdf.addImage(imgData.imageData as any, imgData.format, marginX, y, drawW, drawH);
        } catch (err) {
          console.warn("[PDF] pdf.addImage falló:", err);
        }
      }

      // Tabla de series / cardio
      let bodyRows: string[][] = [];
      let head: string[][] = [];

      if (ex.isCardio && ex.cardio && ex.cardio.length > 0) {
        head = [["Bloque", "Duración", "Intensidad", "Distancia", "Kcal"]];
        bodyRows = ex.cardio.map((c, i) => [
          String(c.blockNumber || i + 1),
          `${c.durationMinutes ?? "-"} min`,
          c.intensity || "-",
          c.distanceKm != null ? `${c.distanceKm} km` : "-",
          c.caloriesKcal != null ? `${c.caloriesKcal}` : "-",
        ]);
      } else if (ex.sets && ex.sets.length > 0) {
        head = [["Serie", "Peso (kg)", "Reps", "RIR", "Estado"]];
        bodyRows = ex.sets.map((set, i) => [
          String(set.setNumber || i + 1),
          set.weight != null ? String(set.weight) : "-",
          set.reps != null ? String(set.reps) : "-",
          set.rir ? String(set.rir) : "-",
          set.completed ? "Completada" : "Pendiente",
        ]);
      } else {
        head = [["Información"]];
        bodyRows = [["Sin series registradas"]];
      }

      autoTable(pdf, {
        startY: Math.max(tableStartY, y),
        margin: { left: nameX, right: marginX },
        head,
        body: bodyRows,
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: 1.6,
          textColor: [30, 30, 30],
          lineColor: [220, 220, 220],
        },
        headStyles: {
          fillColor: DARK,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // @ts-ignore - lastAutoTable lo añade el plugin
      const afterTableY = (pdf as any).lastAutoTable?.finalY ?? tableStartY + 10;
      // Asegurar que la imagen no quede por encima del bloque siguiente
      y = Math.max(afterTableY, y + imgBoxH) + 5;

      if (ex.notes && ex.notes.trim().length > 0) {
        ensureSpace(8);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
        const noteLines = pdf.splitTextToSize(`Notas: ${ex.notes}`, pageWidth - marginX * 2);
        pdf.text(noteLines, marginX, y);
        y += noteLines.length * 4 + 3;
      }
    }

    y += 2;
  }

  // ---- Pie de página ----
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text(
      `XOPATS · Generado el ${new Date().toLocaleDateString("es-ES")}`,
      marginX,
      pageHeight - 8
    );
    pdf.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 8, {
      align: "right",
    });
  }

  const safeDate = dateLabel.replace(/[^\w\-]+/g, "_");
  pdf.save(`entrenamiento_${safeDate}.pdf`);
}
