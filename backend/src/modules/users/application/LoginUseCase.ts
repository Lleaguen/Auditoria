import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../domain/UserRepository';
import { toPublicUser, UserPublic } from '../domain/User';

export interface LoginResult {
  token: string;
  user: UserPublic;
}

export class LoginUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(username: string, password: string): Promise<LoginResult> {
    if (!username || !password) {
      const err = new Error('Username y contraseña son requeridos');
      (err as any).statusCode = 400;
      throw err;
    }

    const user = await this.repo.findByUsername(username.trim().toLowerCase());

    if (!user || !user.passwordHash) {
      const err = new Error('Credenciales inválidas');
      (err as any).statusCode = 401;
      throw err;
    }

    if (!user.active) {
      const err = new Error('Usuario desactivado. Contactá al administrador.');
      (err as any).statusCode = 403;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error('Credenciales inválidas');
      (err as any).statusCode = 401;
      throw err;
    }

    const secret      = process.env.JWT_SECRET ?? 'secret_dev';
    const expiresIn   = process.env.JWT_EXPIRES_IN ?? '8h';
    const publicUser  = toPublicUser(user);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    return { token, user: publicUser };
  }
}
