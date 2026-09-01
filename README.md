# Entrenamiento de Fuerza IA

Aplicación full-stack (React + Vite + Express + TypeScript) para generar rutinas, recomendaciones nutricionales y ejercicios alternativos.

## Desarrollo local

1. Instalar dependencias:

  ```bash
  npm install
  ```

2. (Opcional) Crear `.env.local` con:

  ```env
  GEMINI_API_KEY=tu_clave
  ```

  Si no se define, la app usa fallback local para los endpoints de IA.

3. Iniciar en modo desarrollo:

  ```bash
  npm run dev
  ```

## Despliegue en Vercel

Este proyecto está preparado para Vercel con:

* `api/index.ts` como función serverless de Express.

* `vercel.json` para ejecutar `vite build` y enrutar tanto `/api/*` como frontend a la función.

* `dist/` servido estáticamente desde Express en producción.

Variable de entorno opcional en Vercel:

* `GEMINI_API_KEY` (si no se configura, se mantiene el fallback local).