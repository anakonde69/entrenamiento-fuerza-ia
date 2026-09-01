import app from "../server";

// En Vercel (serverless) el frontend compilado (dist/) lo sirve Vercel de forma
// nativa (outputDirectory). Esta función solo maneja las rutas /api/*.
export default app;
