import DashboardPanel from "@/components/dashboard/DashboardPanel";
import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
          <BarChart3 size={22} className="text-blue-500" />
          Dashboard
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Métricas consolidadas de todas las auditorías guardadas.
        </p>
      </div>

      <DashboardPanel />
    </div>
  );
}
