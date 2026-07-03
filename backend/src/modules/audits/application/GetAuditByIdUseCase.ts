import { Audit } from '../domain/Audit';
import { AuditRepository } from '../domain/AuditRepository';

export class GetAuditByIdUseCase {
  constructor(private readonly repo: AuditRepository) {}

  async execute(id: number): Promise<Audit> {
    if (!id || isNaN(id)) {
      const err = new Error('ID inválido');
      (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 400;
      throw err;
    }

    const audit = await this.repo.findById(id);
    if (!audit) {
      const err = new Error(`Auditoría con id ${id} no encontrada`);
      (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 404;
      throw err;
    }

    return audit;
  }
}
