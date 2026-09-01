import app, { setupStaticAssets } from "../server";

// En Vercel (serverless) servimos frontend compilado + rutas /api/* desde Express.
setupStaticAssets();

export default app;
