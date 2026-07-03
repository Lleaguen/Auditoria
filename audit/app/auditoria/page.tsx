import AuditPanel from "@/components/audit/AuditPanel";
import { ClipboardCheck } from "lucide-react";

export default function AuditoriaPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
          <ClipboardCheck size={22} className="text-blue-500" />
          Auditoría de HU
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Buscá el HU, escaneá los shipments y comparalos contra el sistema.
        </p>
      </div>

      <AuditPanel />
    </div>
  );
}
