import { AuditRepository } from '../domain/AuditRepository';

export class DeleteAuditUseCase {
  constructor(private readonly repo: AuditRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || isNaN(id)) {
      const err = new Error('ID inválido');
      (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 400;
      throw err;
    }

    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = new Error(`Auditoría con id ${id} no encontrada`);
      (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 404;
      throw err;
    }
  }
}
