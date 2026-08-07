import cors from 'cors';

/**
 * Orígenes permitidos:
 * - localhost para desarrollo local del frontend
 * - La URL del frontend deployado (se configura via ALLOWED_ORIGIN)
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:3001',
  'https://lleaguen.github.io',
  'https://lleaguen.github.io/',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (ej: curl, Postman, mismo servidor)
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    const normalizedAllowed = ALLOWED_ORIGINS.map(normalizeOrigin);

    if (normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
});
