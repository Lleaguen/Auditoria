import AuditPanel from "@/components/audit/AuditPanel";
import { ClipboardCheck } from "lucide-react";

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <ClipboardCheck size={14} />
          Auditoría HU
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Auditar pallet
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Buscá el HU, escaneá los shipments y comparalos contra el sistema.
        </p>
      </div>

      <AuditPanel />
    </div>
  );
}
