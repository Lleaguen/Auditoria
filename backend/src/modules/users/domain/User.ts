export type UserRole = 'admin' | 'auditor';
export type SiteKey  = 'CIU' | 'EEV' | '';

export interface User {
  id?: number;
  nombre: string;
  apellido: string;
  username: string;
  passwordHash?: string; // no se devuelve al frontend
  role: UserRole;
  site: SiteKey;
  active: boolean;
  createdAt?: string;
}

export interface UserPublic {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  role: UserRole;
  site: SiteKey;
  active: boolean;
  createdAt?: string;
}

export function toPublicUser(user: User): UserPublic {
  return {
    id:        user.id!,
    nombre:    user.nombre,
    apellido:  user.apellido,
    username:  user.username,
    role:      user.role,
    site:      user.site,
    active:    user.active,
    createdAt: user.createdAt,
  };
}

export function validateUser(user: Partial<User>): string[] {
  const errors: string[] = [];

  if (!user.nombre || user.nombre.trim() === '') {
    errors.push('nombre es requerido');
  }
  if (!user.apellido || user.apellido.trim() === '') {
    errors.push('apellido es requerido');
  }
  if (!user.username || user.username.trim() === '') {
    errors.push('username es requerido');
  }
  if (user.username && user.username.length < 3) {
    errors.push('username debe tener al menos 3 caracteres');
  }

  const validRoles: UserRole[] = ['admin', 'auditor'];
  if (user.role && !validRoles.includes(user.role)) {
    errors.push(`role inválido: ${user.role}. Valores válidos: admin, auditor`);
  }

  return errors;
}
