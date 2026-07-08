import { Target } from 'lucide-react';
import PlanPanel from '@/components/plan/PlanPanel';

export default function PlanPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <Target size={14} />
          Planificación diaria
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Plan de auditoría
        </h1>
        <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
          Definí los sub-CAs a auditar, la cantidad de pallets objetivo y los auditores asignados.
          Seguí el avance en tiempo real con la curva plan vs real.
        </p>
      </div>

      <PlanPanel />
    </div>
  );
}
