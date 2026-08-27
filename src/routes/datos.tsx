import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  PlayCircle,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_LABELS,
  autoMap,
  demoCsv,
  formatBytes,
  validateMapping,
  type FieldKey,
  type Mapping,
} from "@/lib/csv";
import { clearDataset, loadCsvText, runProcessing, useDataset } from "@/lib/dataset-store";

export const Route = createFileRoute("/datos")({
  head: () => ({
    meta: [
      { title: "Datos financieros — carga tu CSV | FinLab" },
      {
        name: "description",
        content:
          "Sube tu archivo CSV, detecta columnas automáticamente, revisa estadísticas descriptivas y procesa los datos para el análisis financiero.",
      },
      { property: "og:title", content: "Datos financieros — carga tu CSV | FinLab" },
      {
        property: "og:description",
        content: "Carga, valida y procesa tu propio CSV financiero paso a paso.",
      },
    ],
  }),
  component: DatosPage,
});

const FIELDS: FieldKey[] = ["date", "open", "high", "low", "close", "volume"];

function DatosPage() {
  const { parsed, profile, processed, steps, isDemo, mapping: savedMapping } = useDataset();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mapping, setMapping] = useState<Mapping | null>(savedMapping);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Solo se aceptan archivos .csv");
      return;
    }
    setPendingFile(file);
  };

  const processFile = async () => {
    if (!pendingFile) {
      toast.error("Selecciona primero un archivo CSV");
      return;
    }
    setLoading(true);
    try {
      const text = await pendingFile.text();
      const { profile: prof } = loadCsvText(text, pendingFile.name, pendingFile.size);
      setMapping(autoMap(prof));
      toast.success(`CSV cargado: ${prof.totalRows} filas, ${prof.totalColumns} columnas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el CSV");
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => {
    setLoading(true);
    try {
      const demo = demoCsv();
      const { profile: prof } = loadCsvText(demo.text, demo.name, demo.text.length, true);
      setMapping(autoMap(prof));
      setPendingFile(null);
      toast.info("Datos de demostración cargados");
    } finally {
      setLoading(false);
    }
  };

  const analyze = () => {
    if (!mapping) return;
    setProcessing(true);
    try {
      const rows = runProcessing(mapping);
      toast.success(`${rows.length} registros procesados y listos para Machine Learning`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al procesar");
    } finally {
      setProcessing(false);
    }
  };

  const missing = mapping ? validateMapping(mapping) : [];

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold tracking-tight">Datos financieros</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        La aplicación trabaja con el archivo CSV que subas: nada se genera automáticamente.
      </p>

      {/* Upload zone */}
      <section className="surface-panel mt-6 p-6">
        <h2 className="text-lg font-semibold">Sube tu archivo CSV para comenzar el análisis</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
          }`}
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arrastra y suelta aquí tu archivo <span className="font-mono">.csv</span> o
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet className="size-4" />
            Seleccionar archivo CSV
          </Button>
          <p className="text-xs text-muted-foreground">Solo se aceptan archivos .csv</p>
        </div>

        {pendingFile ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-sm">
              <p className="font-medium">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setPendingFile(null)} aria-label="Quitar archivo">
                <Trash2 className="size-4" />
              </Button>
              <Button onClick={processFile} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                Procesar CSV
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Procesando archivo…
          </p>
        ) : null}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Opción secundaria</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={loadDemo}>
              <Sparkles className="size-4" />
              Usar datos de demostración
            </Button>
            <span className="text-xs text-muted-foreground">
              Solo para probar la app sin subir un archivo. La opción recomendada es subir tu CSV.
            </span>
          </div>
        </div>
      </section>

      {parsed && profile ? (
        <>
          {/* Summary */}
          <section className="surface-panel mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Archivo: {parsed.fileName}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(parsed.fileSize)}
                  {isDemo ? " · demostración" : ""}
                </p>
              </div>
              <Button variant="ghost" onClick={() => { clearDataset(); setMapping(null); }}>
                <Trash2 className="size-4" /> Quitar dataset
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Registros", profile.totalRows.toLocaleString("es")],
                ["Columnas", String(profile.totalColumns)],
                ["Valores nulos", profile.totalNulls.toLocaleString("es")],
                ["Filas duplicadas", profile.duplicateRows.toLocaleString("es")],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium">Columnas detectadas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.columns.map((c) => (
                  <Badge key={c.name} variant="secondary" className="font-mono text-xs">
                    {c.name}
                    <span className="ml-1 text-muted-foreground">
                      · {c.type === "numeric" ? "numérica" : c.type === "date" ? "fecha" : "texto"}
                    </span>
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ninguna columna se elimina: las que no se asignen se conservan en el dataset original.
              </p>
            </div>
          </section>

          {/* Preview */}
          <section className="surface-panel mt-6 overflow-hidden">
            <div className="p-6 pb-3">
              <h2 className="text-lg font-semibold">Vista previa (primeros 10 registros)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    {parsed.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {parsed.columns.map((c) => (
                        <td key={c} className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                          {r[c] === "" ? "—" : r[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Descriptive stats */}
          <section className="surface-panel mt-6 overflow-hidden">
            <div className="p-6 pb-3">
              <h2 className="text-lg font-semibold">Estadísticas descriptivas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    {["Columna", "Tipo", "Nulos", "Únicos", "Mín", "Máx", "Media", "Mediana", "Desv."].map((h) => (
                      <th key={h} className="px-4 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profile.columns.map((c) => (
                    <tr key={c.name} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{c.name}</td>
                      <td className="px-4 py-2 text-xs">{c.type}</td>
                      <td className="px-4 py-2 tabular-nums">{c.nulls}</td>
                      <td className="px-4 py-2 tabular-nums">{c.unique}</td>
                      {(["min", "max", "mean", "median", "std"] as const).map((k) => (
                        <td key={k} className="px-4 py-2 tabular-nums text-muted-foreground">
                          {c[k] !== undefined ? c[k]!.toFixed(2) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mapping */}
          <section className="surface-panel mt-6 p-6">
            <h2 className="text-lg font-semibold">Asignación de columnas</h2>
            <p className="text-sm text-muted-foreground">
              Detectamos automáticamente Date/Open/High/Low/Close/Volume. Si tus columnas tienen otros
              nombres, selecciónalas manualmente.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((field) => (
                <div key={field}>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    {FIELD_LABELS[field]}
                    {(field === "date" || field === "close") && <span className="text-destructive"> *</span>}
                  </label>
                  <Select
                    value={mapping?.[field] ?? "__none__"}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...(m ?? { date: null, open: null, high: null, low: null, close: null, volume: null }),
                        [field]: v === "__none__" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {parsed.columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missing.length ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                Falta información obligatoria: {missing.join(", ")}
              </p>
            ) : (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                El archivo es compatible con el análisis financiero.
              </p>
            )}

            <Button className="mt-4" size="lg" onClick={analyze} disabled={missing.length > 0 || processing}>
              {processing ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Procesar y analizar datos
            </Button>
          </section>

          {steps.length ? (
            <section className="surface-panel mt-6 p-6">
              <h2 className="text-lg font-semibold">Pipeline ejecutado</h2>
              <ol className="mt-3 space-y-2">
                {steps.map((s, i) => (
                  <li key={s.label} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium">{s.label}</span>{" "}
                      <span className="text-muted-foreground">— {s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {processed?.length ? (
            <section className="surface-panel mt-6 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
                <h2 className="text-lg font-semibold">Datos preparados (con columna Tendencia)</h2>
                <Button asChild variant="outline">
                  <Link to="/modelos">Ir a los modelos</Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-left">
                    <tr>
                      {["Fecha", "Apertura", "Máximo", "Mínimo", "Cierre", "Volumen", "Variación %", "Tendencia"].map(
                        (h) => (
                          <th key={h} className="px-4 py-2 font-medium">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {processed.slice(0, 10).map((r) => (
                      <tr key={r.timestamp} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{r.date}</td>
                        <td className="px-4 py-2 tabular-nums">{r.open.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">{r.high.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">{r.low.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">{r.close.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">{r.volume.toLocaleString("es")}</td>
                        <td className="px-4 py-2 tabular-nums">{r.variacion.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <Badge variant={r.tendencia === 1 ? "default" : "secondary"}>{r.tendencia}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
