import app from "../server";

// Envoltorio con captura de errores: si algo falla en runtime dentro de Vercel,
// devolvemos el mensaje real en la respuesta HTTP (en vez de un 500 genérico
// sin información), lo que permite diagnosticar el problema rápidamente.
export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  try {
    await app(req, res);
  } catch (err: any) {
    console.error("API ERROR:", err);
    try {
      if (!res.headersSent) {
        res.status(500).json({
          error: err?.message || String(err),
          stack: err?.stack ? err.stack.split("\n").slice(0, 8).join("\n") : undefined,
        });
      } else {
        res.end();
      }
    } catch (_) {
      try {
        res.status(500).send("API error: " + (err?.message || String(err)));
      } catch (__) {
        /* noop */
      }
    }
  }
}
