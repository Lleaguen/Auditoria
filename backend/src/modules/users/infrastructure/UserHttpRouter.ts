import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth';
import { LoginUseCase } from '../application/LoginUseCase';
import { CreateUserUseCase } from '../application/CreateUserUseCase';
import { GetAllUsersUseCase } from '../application/GetAllUsersUseCase';
import { DeleteUserUseCase } from '../application/DeleteUserUseCase';
import { UserRepository } from '../domain/UserRepository';
import { UserRole } from '../domain/User';

export function createUserRouter(repo: UserRepository): Router {
  const router = Router();

  const login      = new LoginUseCase(repo);
  const createUser = new CreateUserUseCase(repo);
  const getAllUsers = new GetAllUsersUseCase(repo);
  const deleteUser = new DeleteUserUseCase(repo);

  // ── POST /api/auth/login ──────────────────────────────────────────────────
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await login.execute(username, password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/auth/me ── usuario actual ────────────────────────────────────
  router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await repo.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        return;
      }
      const { passwordHash: _, ...publicUser } = user;
      res.json({ success: true, data: publicUser });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /api/auth/users — solo admin ──────────────────────────────────────
  router.get('/users', requireAuth, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await getAllUsers.execute();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /api/auth/users — solo admin ─────────────────────────────────────
  router.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nombre, apellido, username, password, role } = req.body;
      const user = await createUser.execute({
        nombre,
        apellido,
        username,
        password,
        role: (role ?? 'auditor') as UserRole,
      });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /api/auth/users/:id — solo admin ───────────────────────────────
  router.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteUser.execute(id, req.user!.userId);
      res.json({ success: true, message: `Usuario ${id} eliminado` });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
