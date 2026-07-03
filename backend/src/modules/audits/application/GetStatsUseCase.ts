import { Audit } from '../domain/Audit';
import { AuditRepository, AuditFilters } from '../domain/AuditRepository';

// ── Tipos de stats (misma lógica que el frontend) ────────────────────────────

export interface DailyStats {
  date: string;
  totalHusAudited: number;
  husWithDeviation: number;
  percentHusWithDeviation: number;
  totalShipmentsAudited: number;
  totalMissing: number;
  totalSurplus: number;
  totalDamaged: number;
  percentWithErrors: number;
}

export interface SubcaStats {
  subca: string;
  husAuditados: number;
  totalShipments: number;
  totalMissing: number;
  totalSurplus: number;
  totalOk: number;
}

export interface UserStats {
  userId: string;
  totalHus: number;
  totalShipments: number;
  totalErrors: number;
  errorRate: number;
}

export interface StatsResult {
  daily: DailyStats[];
  subca: SubcaStats[];
  users: UserStats[];
  totals: {
    totalHus: number;
    totalShipments: number;
    totalMissing: number;
    totalSurplus: number;
    husWithDeviation: number;
  };
}

export class GetStatsUseCase {
  constructor(private readonly repo: AuditRepository) {}

  async execute(filters?: AuditFilters): Promise<StatsResult> {
    const audits = await this.repo.findAll(filters);

    return {
      daily: this.computeDaily(audits),
      subca: this.computeSubca(audits),
      users: this.computeUsers(audits),
      totals: this.computeTotals(audits),
    };
  }

  private computeTotals(audits: Audit[]) {
    const totalHus = audits.length;
    const totalShipments = audits.reduce((s, a) => s + a.totalSystem, 0);
    const totalMissing = audits.reduce((s, a) => s + a.totalMissing, 0);
    const totalSurplus = audits.reduce((s, a) => s + a.totalSurplus, 0);
    const husWithDeviation = audits.filter(
      (a) => a.totalMissing > 0 || a.totalSurplus > 0 || a.totalCrossed > 0
    ).length;
    return { totalHus, totalShipments, totalMissing, totalSurplus, husWithDeviation };
  }

  private computeDaily(audits: Audit[]): DailyStats[] {
    const byDate = new Map<string, Audit[]>();
    for (const a of audits) {
      const list = byDate.get(a.date) ?? [];
      list.push(a);
      byDate.set(a.date, list);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => {
        const totalHusAudited = list.length;
        const husWithDeviation = list.filter(
          (a) => a.totalMissing > 0 || a.totalSurplus > 0 || a.totalCrossed > 0
        ).length;
        const totalShipmentsAudited = list.reduce((s, a) => s + a.totalSystem, 0);
        const totalMissing = list.reduce((s, a) => s + a.totalMissing, 0);
        const totalSurplus = list.reduce((s, a) => s + a.totalSurplus, 0);
        const totalWithErrors = totalMissing + totalSurplus;

        return {
          date,
          totalHusAudited,
          husWithDeviation,
          percentHusWithDeviation:
            totalHusAudited > 0
              ? Math.round((husWithDeviation / totalHusAudited) * 10000) / 100
              : 0,
          totalShipmentsAudited,
          totalMissing,
          totalSurplus,
          totalDamaged: 0,
          percentWithErrors:
            totalShipmentsAudited > 0
              ? Math.round((totalWithErrors / totalShipmentsAudited) * 10000) / 100
              : 0,
        };
      });
  }

  private computeSubca(audits: Audit[]): SubcaStats[] {
    const bySubca = new Map<string, Audit[]>();
    for (const a of audits) {
      const list = bySubca.get(a.subca) ?? [];
      list.push(a);
      bySubca.set(a.subca, list);
    }

    return [...bySubca.entries()].map(([subca, list]) => ({
      subca,
      husAuditados: list.length,
      totalShipments: list.reduce((s, a) => s + a.totalSystem, 0),
      totalMissing: list.reduce((s, a) => s + a.totalMissing, 0),
      totalSurplus: list.reduce((s, a) => s + a.totalSurplus, 0),
      totalOk: list.reduce((s, a) => s + a.totalOk, 0),
    }));
  }

  private computeUsers(audits: Audit[]): UserStats[] {
    const byUser = new Map<string, { hus: number; shipments: number; errors: number }>();

    for (const a of audits) {
      for (const user of a.assemblyUsers) {
        const s = byUser.get(user) ?? { hus: 0, shipments: 0, errors: 0 };
        s.hus += 1;
        s.shipments += a.totalSystem;
        s.errors += a.totalMissing + a.totalSurplus;
        byUser.set(user, s);
      }
    }

    return [...byUser.entries()].map(([userId, s]) => ({
      userId,
      totalHus: s.hus,
      totalShipments: s.shipments,
      totalErrors: s.errors,
      errorRate:
        s.shipments > 0
          ? Math.round((s.errors / s.shipments) * 10000) / 100
          : 0,
    }));
  }
}
