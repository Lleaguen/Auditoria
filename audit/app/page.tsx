import CsvUploader from "@/components/csv/CsvUploader";
import { Upload } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
          <Upload size={22} className="text-blue-500" />
          Cargar dataset CSV
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Cargá el archivo exportado del sistema. El dataset quedará disponible
          para auditar cualquier HU mientras la sesión esté activa.
        </p>
      </div>

      <CsvUploader />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">¿Cómo funciona?</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-600">
          <li>Cargá el CSV exportado del sistema (delimitado por comas).</li>
          <li>
            Ir a <strong>Auditoría HU</strong> → ingresá el número de HU
            (Outbound ID).
          </li>
          <li>Escaneá los shipments físicos con el scanner.</li>
          <li>
            Hacé clic en <strong>Comparar con sistema</strong> para ver
            faltantes, sobrantes y cruzados.
          </li>
          <li>
            Guardá la auditoría para que aparezca en el{" "}
            <strong>Dashboard</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
