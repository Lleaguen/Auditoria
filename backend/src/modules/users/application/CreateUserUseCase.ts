import bcrypt from 'bcrypt';
import { UserRepository } from '../domain/UserRepository';
import { User, UserRole, validateUser, toPublicUser, UserPublic } from '../domain/User';

interface CreateUserInput {
  nombre: string;
  apellido: string;
  username: string;
  password: string;
  role: UserRole;
}

export class CreateUserUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(input: CreateUserInput): Promise<UserPublic> {
    const errors = validateUser(input);

    if (!input.password || input.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (errors.length > 0) {
      const err = new Error(`Validación: ${errors.join(', ')}`);
      (err as any).statusCode = 400;
      throw err;
    }

    // Verificar username único
    const existing = await this.repo.findByUsername(input.username.trim().toLowerCase());
    if (existing) {
      const err = new Error(`El username "${input.username}" ya está en uso`);
      (err as any).statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const created = await this.repo.save({
      nombre:       input.nombre.trim(),
      apellido:     input.apellido.trim(),
      username:     input.username.trim().toLowerCase(),
      passwordHash,
      role:         input.role,
      active:       true,
    });

    return toPublicUser(created);
  }
}
