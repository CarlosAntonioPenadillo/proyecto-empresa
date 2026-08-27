import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Database, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDataset } from "@/lib/dataset-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinLab — Análisis financiero con tu CSV" },
      {
        name: "description",
        content:
          "Sube tu propio CSV financiero y analízalo con estadísticas, gráficos y modelos de Machine Learning y Deep Learning en el navegador.",
      },
      { property: "og:title", content: "FinLab — Análisis financiero con tu CSV" },
      {
        property: "og:description",
        content: "Carga tu CSV real y ejecuta análisis estadístico y modelos predictivos.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { parsed, processed, isDemo } = useDataset();

  if (!parsed || !processed || processed.length === 0) {
    return (
      <AppShell>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Dashboard financiero</h1>
        <EmptyState />
      </AppShell>
    );
  }

  const first = processed[0]!;
  const last = processed[processed.length - 1]!;
  const change = ((last.close - first.close) / (first.close || 1)) * 100;
  const ups = processed.filter((r) => r.tendencia === 1).length;
  const maxClose = Math.max(...processed.map((r) => r.close));
  const minClose = Math.min(...processed.map((r) => r.close));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard financiero</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="size-4" />
            {parsed.fileName}
            {isDemo ? <Badge variant="secondary">Datos de demostración</Badge> : null}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/datos">
            <Upload className="size-4" />
            Cambiar CSV
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registros procesados" value={processed.length.toLocaleString("es")} />
        <Stat
          label="Último cierre"
          value={last.close.toLocaleString("es", { maximumFractionDigits: 2 })}
          hint={last.date}
        />
        <Stat
          label="Variación del período"
          value={`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
          hint={`${first.date} → ${last.date}`}
        />
        <Stat
          label="Días al alza"
          value={`${ups} / ${processed.length}`}
          hint={`${((ups / processed.length) * 100).toFixed(1)}% de tendencia = 1`}
        />
      </div>

      <div className="surface-panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Evolución del precio de cierre</h2>
        <p className="text-sm text-muted-foreground">
          Rango {minClose.toFixed(2)} – {maxClose.toFixed(2)}
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processed}>
              <defs>
                <linearGradient id="close" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
              />
              <Area dataKey="close" stroke="var(--color-primary)" fill="url(#close)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface-panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Últimos movimientos</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {processed.slice(-8).reverse().map((r) => (
            <li key={r.timestamp} className="flex items-center justify-between py-2">
              <span className="font-mono text-muted-foreground">{r.date}</span>
              <span className="tabular-nums">{r.close.toFixed(2)}</span>
              <span
                className={`flex w-24 items-center justify-end gap-1 tabular-nums ${
                  r.tendencia === 1 ? "text-success" : "text-destructive"
                }`}
              >
                {r.tendencia === 1 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {r.variacion.toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
