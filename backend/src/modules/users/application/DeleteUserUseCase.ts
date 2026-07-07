import { UserRepository } from '../domain/UserRepository';

export class DeleteUserUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: number, requesterId: number): Promise<void> {
    if (id === requesterId) {
      const err = new Error('No podés eliminar tu propio usuario');
      (err as any).statusCode = 400;
      throw err;
    }

    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = new Error(`Usuario con id ${id} no encontrado`);
      (err as any).statusCode = 404;
      throw err;
    }
  }
}
