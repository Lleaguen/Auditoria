import PreviewPanel from '@/components/dashboard/PreviewPanel';
import { FlaskConical } from 'lucide-react';

export default function PreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mb-2">
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Dashboard — Avance Auditado
        </h1>
        
      </div>

      <PreviewPanel />
    </div>
  );
}
