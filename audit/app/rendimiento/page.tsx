import { BarChart2 } from 'lucide-react';
import PerformancePanel from '@/components/performance/PerformancePanel';

export default function RendimientoPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <BarChart2 size={14} />
          Solo administradores
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Rendimiento de auditores
        </h1>
        <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
          Estadísticas de desempeño por auditor basadas en las auditorías guardadas.
        </p>
      </div>

      <PerformancePanel />
    </div>
  );
}
