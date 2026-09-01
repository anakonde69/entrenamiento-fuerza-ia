import app from "../server";

// En Vercel, el frontend (dist/) lo sirve la CDN de Vercel de forma nativa
// (ver outputDirectory en vercel.json). Esta función solo maneja las rutas /api/*.
export default app;
