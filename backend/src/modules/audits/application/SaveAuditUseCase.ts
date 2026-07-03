import { Audit, validateAudit } from '../domain/Audit';
import { AuditRepository } from '../domain/AuditRepository';

export class SaveAuditUseCase {
  constructor(private readonly repo: AuditRepository) {}

  async execute(auditData: Omit<Audit, 'id' | 'createdAt'>): Promise<Audit> {
    // Validar dominio
    const errors = validateAudit(auditData);
    if (errors.length > 0) {
      const err = new Error(`Validación fallida: ${errors.join(', ')}`);
      (err as NodeJS.ErrnoException & { statusCode: number }).statusCode = 400;
      throw err;
    }

    // Normalizar datos
    const audit: Audit = {
      ...auditData,
      huId: auditData.huId.trim(),
      date: auditData.date.trim(),
      shift: auditData.shift ?? '',
      subca: auditData.subca ?? '',
      assemblyUsers: auditData.assemblyUsers ?? [],
      crossedHus: auditData.crossedHus ?? [],
      systemShipments: auditData.systemShipments ?? [],
      scannedShipments: auditData.scannedShipments ?? [],
      results: auditData.results ?? [],
    };

    return this.repo.save(audit);
  }
}
