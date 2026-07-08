import { Pool } from 'pg';
import { User, UserRole } from '../domain/User';
import { UserRepository } from '../domain/UserRepository';

interface UserRow {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  password_hash: string;
  role: string;
  active: boolean;
  created_at: Date;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private rowToUser(row: UserRow): User {
    return {
      id:           row.id,
      nombre:       row.nombre,
      apellido:     row.apellido,
      username:     row.username,
      passwordHash: row.password_hash,
      role:         row.role as UserRole,
      active:       row.active,
      createdAt:    row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    };
  }

  async findById(id: number): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows.length > 0 ? this.rowToUser(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    return rows.length > 0 ? this.rowToUser(rows[0]) : null;
  }

  async findAll(): Promise<User[]> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT * FROM users ORDER BY created_at ASC'
    );
    return rows.map((r) => this.rowToUser(r));
  }

  async save(user: Omit<User, 'id' | 'createdAt'> & { passwordHash: string }): Promise<User> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (nombre, apellido, username, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.nombre, user.apellido, user.username, user.passwordHash, user.role, user.active]
    );
    return this.rowToUser(rows[0]);
  }

  async delete(id: number): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  async setActive(id: number, active: boolean): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'UPDATE users SET active = $1 WHERE id = $2',
      [active, id]
    );
    return (rowCount ?? 0) > 0;
  }

  async updateRole(id: number, role: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, id]
    );
    return (rowCount ?? 0) > 0;
  }
}
