import { User } from './User';

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: Omit<User, 'id' | 'createdAt'> & { passwordHash: string }): Promise<User>;
  delete(id: number): Promise<boolean>;
  setActive(id: number, active: boolean): Promise<boolean>;
  updateRole(id: number, role: string): Promise<boolean>;
}
