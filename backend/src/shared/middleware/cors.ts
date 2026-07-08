import cors from 'cors';

/**
 * Orígenes permitidos:
 * - localhost para desarrollo local del frontend
 * - La URL del frontend deployado (se configura via ALLOWED_ORIGIN)
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (ej: curl, Postman, mismo servidor)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
});
