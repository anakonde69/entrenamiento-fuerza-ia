import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FreeWorkoutLog } from "../types";

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

/**
 * Carga una imagen y devuelve su data URL y dimensiones para incrustarla en jsPDF.
 * - Si la fuente ya ES un data URL (fotos del usuario guardadas en Firestore),
 *   lo usa directamente sin pasar por canvas (evita tainting de canvas).
 * - Si es una URL http(s), la descarga con fetch y la convierte a data URL.
 */
async function loadImageAsDataUrl(
  src: string
): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  if (!src || typeof src !== "string" || src.trim() === "") return null;

  // ── Caso 1: ya es un data URL ───────────────────────────────────────────────
  if (src.startsWith("data:")) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          dataUrl: src,
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
          format: detectImageFormat(src),
        });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // ── Caso 2: URL http(s) — fetch para evitar CORS con canvas ─────────────────
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) { resolve(null); return; }
        const img = new Image();
        img.onload = () =>
          resolve({
            dataUrl,
            width: img.naturalWidth || 400,
            height: img.naturalHeight || 300,
            format: detectImageFormat(dataUrl),
          });
        img.onerror = () =>
          resolve({ dataUrl, width: 400, height: 300, format: detectImageFormat(dataUrl) });
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
 */
export async function generateDayWorkoutPdf(
  dateLabel: string,
  logs: FreeWorkoutLog[]
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
      const imgSrc =
        (ex.imageUrls && ex.imageUrls.length > 0 ? ex.imageUrls[0] : "") || ex.imageUrl || "";
      let imgData: { dataUrl: string; width: number; height: number } | null = null;
      if (imgSrc) {
        imgData = await loadImageAsDataUrl(imgSrc);
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
          pdf.addImage(imgData.dataUrl, imgData.format, marginX, y, drawW, drawH);
        } catch {
          /* si falla la imagen, continuar sin ella */
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
