import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de API Key por planta.
 *
 * Cada planta tiene su propia clave configurada en .env:
 *   API_KEY_CIU=clave_secreta_soldati
 *   API_KEY_EEV=clave_secreta_echeverria
 *
 * El frontend la manda en el header: X-Api-Key: <clave>
 *
 * Si ninguna de las dos está definida en .env (entorno de desarrollo),
 * el middleware deja pasar para no bloquear el desarrollo local.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const keyCiu = process.env.API_KEY_CIU;
  const keyEev = process.env.API_KEY_EEV;

  // Sin claves configuradas → modo desarrollo, dejar pasar
  if (!keyCiu && !keyEev) {
    next();
    return;
  }

  const incomingKey = req.headers['x-api-key'];

  if (!incomingKey) {
    res.status(401).json({ success: false, error: 'API Key requerida' });
    return;
  }

  const validKeys = [keyCiu, keyEev].filter(Boolean) as string[];
  const isValid   = validKeys.some((k) => k === incomingKey);

  if (!isValid) {
    res.status(403).json({ success: false, error: 'API Key inválida' });
    return;
  }

  next();
}
