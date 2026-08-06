'use client';

import PostAuditPanel from '@/components/post-audit/PostAuditPanel';

export default function PostAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Post-Auditoría</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Cargá el CSV actualizado del sistema y verificá si los errores detectados fueron corregidos.
        </p>
      </div>
      <PostAuditPanel />
    </div>
  );
}
