import CsvUploader from "@/components/csv/CsvUploader";
import { Upload, ArrowRight, ScanLine, BarChart3, Save } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-sm font-semibold mb-2">
          <Upload size={14} />
          Paso 1 de 3
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
          Cargar dataset CSV
        </h1>
        <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
          Cargá el archivo exportado del sistema. El dataset queda disponible en memoria
          para auditar cualquier HU durante la sesión.
        </p>
      </div>

      <CsvUploader />

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
        <p className="text-sm font-semibold text-zinc-700 mb-4">¿Cómo funciona?</p>
        <ol className="space-y-3">
          {[
            { icon: Upload,         text: 'Cargá el CSV exportado del sistema (delimitado por comas).' },
            { icon: ScanLine,       text: 'Ir a Auditoría HU → ingresá el Outbound ID y escaneá los shipments físicos.' },
            { icon: ArrowRight,     text: 'Hacé clic en Comparar para ver faltantes, sobrantes y cruzados.' },
            { icon: Save,           text: 'Guardá la auditoría en la base de datos local.' },
            { icon: BarChart3,      text: 'Revisá métricas consolidadas en el Dashboard.' },
          ].map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 shrink-0 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-600 leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
