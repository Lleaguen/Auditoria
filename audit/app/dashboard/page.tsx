import DashboardPanel from "@/components/dashboard/DashboardPanel";
import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <BarChart3 size={14} />
          Dashboard
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Métricas y reportes
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Estadísticas consolidadas de todas las auditorías guardadas.
        </p>
      </div>

      <DashboardPanel />
    </div>
  );
}
