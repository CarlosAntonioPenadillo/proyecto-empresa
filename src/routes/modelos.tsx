import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BrainCircuit, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDataset } from "@/lib/dataset-store";
import { runModels, type TrainingReport } from "@/lib/ml";

export const Route = createFileRoute("/modelos")({
  head: () => ({
    meta: [
      { title: "Modelos ML y Deep Learning | FinLab" },
      {
        name: "description",
        content:
          "Entrena regresión logística y una red neuronal sobre tu propio CSV financiero, compara métricas y obtén la predicción de tendencia.",
      },
      { property: "og:title", content: "Modelos ML y Deep Learning | FinLab" },
      {
        property: "og:description",
        content: "Comparación de modelos predictivos entrenados con los datos de tu CSV.",
      },
    ],
  }),
  component: ModelosPage,
});

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function ModelosPage() {
  const { parsed, processed } = useDataset();
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [training, setTraining] = useState(false);

  if (!processed || processed.length === 0) {
    return (
      <AppShell>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Modelos ML / DL</h1>
        <EmptyState description="Los modelos se entrenan con los datos reales de tu CSV. Sube y procesa tu archivo para comenzar." />
      </AppShell>
    );
  }

  const train = () => {
    setTraining(true);
    setTimeout(() => {
      try {
        setReport(runModels(processed));
        toast.success("Modelos entrenados con tus datos");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al entrenar");
      } finally {
        setTraining(false);
      }
    }, 30);
  };

  const best = report ? [...report.models].sort((a, b) => b.metrics.f1 - a.metrics.f1)[0] : null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Modelos ML / DL</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrenados sobre {processed.length.toLocaleString("es")} registros de{" "}
            <span className="font-mono">{parsed?.fileName}</span> · objetivo: Tendencia del día siguiente
          </p>
        </div>
        <Button size="lg" onClick={train} disabled={training}>
          {training ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
          Entrenar y comparar modelos
        </Button>
      </div>

      {!report ? (
        <div className="surface-panel mt-6 p-6 text-sm text-muted-foreground">
          Pulsa «Entrenar y comparar modelos» para ejecutar la regresión logística, la red neuronal densa
          (MLP 6-8-1 con backpropagation) y el baseline de momentum sobre tus datos. División temporal
          80% entrenamiento / 20% prueba, con features de retornos, medias móviles, volumen y volatilidad.
        </div>
      ) : (
        <>
          <div className="surface-panel mt-6 p-5">
            <p className="text-sm text-muted-foreground">
              Entrenamiento: {report.trainSize} muestras · Prueba: {report.testSize} muestras
            </p>
            {best ? (
              <p className="mt-2 text-sm">
                Mejor modelo por F1: <span className="font-semibold">{best.name}</span> ({pct(best.metrics.f1)})
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {report.models.map((m) => (
              <div key={m.name} className="surface-panel p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{m.name}</h2>
                  {best?.name === m.name ? <Badge>Mejor</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Exactitud", m.metrics.accuracy],
                    ["Precisión", m.metrics.precision],
                    ["Recall", m.metrics.recall],
                    ["F1", m.metrics.f1],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-lg bg-secondary/40 p-2">
                      <dt className="text-xs text-muted-foreground">{label as string}</dt>
                      <dd className="tabular-nums font-medium">{pct(value as number)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Matriz de confusión — VP {m.metrics.confusion.tp} · VN {m.metrics.confusion.tn} · FP{" "}
                  {m.metrics.confusion.fp} · FN {m.metrics.confusion.fn}
                </p>
                <div
                  className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    m.nextProbability >= 0.5
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                  }`}
                >
                  {m.nextProbability >= 0.5 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  Próxima sesión: {m.nextProbability >= 0.5 ? "subida" : "bajada"} ({pct(m.nextProbability)})
                </div>
              </div>
            ))}
          </div>

          <div className="surface-panel mt-6 p-5">
            <h2 className="text-lg font-semibold">Curva de pérdida (entrenamiento)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(report.models[0]?.loss ?? []).map((v, i) => ({
                    epoch: i * 10,
                    logistica: v,
                    red: report.models[1]?.loss[i] ?? null,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line dataKey="logistica" stroke="var(--color-chart-1)" dot={false} strokeWidth={2} />
                  <Line dataKey="red" stroke="var(--color-chart-2)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-panel mt-6 p-5">
            <h2 className="text-lg font-semibold">Probabilidad de subida en el conjunto de prueba</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={report.testActual.map((y, i) => ({
                    date: report.testDates[i] ?? String(i),
                    real: y,
                    logistica: report.models[0]?.testProbas[i] ?? null,
                    red: report.models[1]?.testProbas[i] ?? null,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line dataKey="real" stroke="var(--color-muted-foreground)" dot={false} strokeWidth={1} />
                  <Line dataKey="logistica" stroke="var(--color-chart-1)" dot={false} strokeWidth={2} />
                  <Line dataKey="red" stroke="var(--color-chart-2)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Nota: los modelos se entrenan íntegramente en tu navegador con implementaciones en JavaScript
              equivalentes a un MLP de PyTorch/Keras; no se envía ningún dato a servidores externos.
            </p>
          </div>

          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/datos">Volver a los datos</Link>
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
