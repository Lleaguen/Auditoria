import { Audit } from '../domain/Audit';
import { AuditRepository, AuditFilters } from '../domain/AuditRepository';

export class GetAllAuditsUseCase {
  constructor(private readonly repo: AuditRepository) {}

  async execute(filters?: AuditFilters): Promise<Audit[]> {
    return this.repo.findAll(filters);
  }
}
