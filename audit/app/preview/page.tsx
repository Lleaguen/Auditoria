import PreviewPanel from '@/components/dashboard/PreviewPanel';
import { FlaskConical } from 'lucide-react';

export default function PreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mb-2">
          <FlaskConical size={14} />
          Vista de prueba
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Dashboard — datos del Excel
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">
          Visualización basada en el archivo importado. Solo accesible para administradores.
        </p>
      </div>

      <PreviewPanel />
    </div>
  );
}
