export type Row = Record<string, string>;

export interface ParsedCsv {
  fileName: string;
  fileSize: number;
  columns: string[];
  rows: Row[];
}

export interface ColumnProfile {
  name: string;
  type: "numeric" | "date" | "text";
  nulls: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
}

export interface CsvProfile {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  totalNulls: number;
  columns: ColumnProfile[];
}

export type FieldKey = "date" | "open" | "high" | "low" | "close" | "volume";

export const FIELD_LABELS: Record<FieldKey, string> = {
  date: "Fecha",
  open: "Precio de apertura",
  high: "Precio máximo",
  low: "Precio mínimo",
  close: "Precio de cierre",
  volume: "Volumen",
};

export type Mapping = Record<FieldKey, string | null>;

export interface ProcessedRow {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  variacion: number;
  tendencia: 0 | 1;
}

export interface ProcessResult {
  rows: ProcessedRow[];
  steps: { label: string; detail: string }[];
}

/* ---------------- parsing ---------------- */

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const n = splitLine(headerLine, d).length;
    if (n > bestCount) {
      bestCount = n;
      best = d;
    }
  }
  return best;
}

export function parseCsv(text: string, fileName: string, fileSize: number): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("El archivo CSV está vacío.");
  const headerLine = lines[0] ?? "";
  const delimiter = detectDelimiter(headerLine);
  const columns = splitLine(headerLine, delimiter).map((c, i) => c || `columna_${i + 1}`);
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i] ?? "", delimiter);
    const row: Row = {};
    columns.forEach((c, idx) => {
      row[c] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return { fileName, fileSize, columns, rows };
}

/* ---------------- profiling ---------------- */

export const isNull = (v: string | undefined) =>
  v === undefined || v.trim() === "" || ["na", "n/a", "nan", "null", "none", "-"].includes(v.trim().toLowerCase());

export function toNumber(v: string | undefined): number | null {
  if (isNull(v)) return null;
  let s = v!.trim().replace(/[$€%\s]/g, "");
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toDate(v: string | undefined): Date | null {
  if (isNull(v)) return null;
  const s = v!.trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1] ?? 1));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime()) && /[-/:]|\d{4}/.test(s)) return d;
  return null;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base] ?? 0;
  const hi = sorted[base + 1];
  if (hi !== undefined) return lo + rest * (hi - lo);
  return lo;
}

export function profileCsv(parsed: ParsedCsv): CsvProfile {
  const { rows, columns } = parsed;
  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const r of rows) {
    const key = columns.map((c) => r[c]).join("\u0001");
    if (seen.has(key)) duplicateRows++;
    else seen.add(key);
  }

  let totalNulls = 0;
  const colProfiles: ColumnProfile[] = columns.map((name) => {
    const values = rows.map((r) => r[name]);
    const nulls = values.filter(isNull).length;
    totalNulls += nulls;
    const nonNull = values.filter((v) => !isNull(v));
    const unique = new Set(nonNull).size;
    const nums = nonNull.map(toNumber).filter((n): n is number => n !== null);
    const dates = nonNull.filter((v) => toDate(v) !== null);
    const numericRatio = nonNull.length ? nums.length / nonNull.length : 0;
    const dateRatio = nonNull.length ? dates.length / nonNull.length : 0;

    if (numericRatio >= 0.9 && nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      return {
        name,
        type: "numeric",
        nulls,
        unique,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        mean,
        median: quantile(sorted, 0.5),
        std,
      };
    }
    if (dateRatio >= 0.9 && dates.length > 0) return { name, type: "date", nulls, unique };
    return { name, type: "text", nulls, unique };
  });

  return {
    totalRows: rows.length,
    totalColumns: columns.length,
    duplicateRows,
    totalNulls,
    columns: colProfiles,
  };
}

/* ---------------- mapping ---------------- */

const ALIASES: Record<FieldKey, string[]> = {
  date: ["date", "fecha", "datetime", "time", "timestamp", "dia", "día"],
  open: ["open", "apertura", "abre", "precio_apertura", "open_price"],
  high: ["high", "maximo", "máximo", "max", "alto"],
  low: ["low", "minimo", "mínimo", "min", "bajo"],
  close: ["close", "cierre", "adj close", "close_price", "precio_cierre", "precio", "price"],
  volume: ["volume", "volumen", "vol", "cantidad"],
};

export function autoMap(profile: CsvProfile): Mapping {
  const mapping: Mapping = { date: null, open: null, high: null, low: null, close: null, volume: null };
  const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_-]+/g, " ");
  const used = new Set<string>();
  (Object.keys(ALIASES) as FieldKey[]).forEach((key) => {
    const match = profile.columns.find(
      (c) => !used.has(c.name) && ALIASES[key].some((a) => norm(c.name) === a || norm(c.name).includes(a)),
    );
    if (match) {
      mapping[key] = match.name;
      used.add(match.name);
    }
  });
  return mapping;
}

export const REQUIRED_FIELDS: FieldKey[] = ["date", "close"];

export function validateMapping(mapping: Mapping): string[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f]).map((f) => FIELD_LABELS[f]);
}

/* ---------------- processing pipeline ---------------- */

export function processDataset(parsed: ParsedCsv, mapping: Mapping): ProcessResult {
  const steps: { label: string; detail: string }[] = [];
  steps.push({ label: "Lectura", detail: `${parsed.rows.length} filas leídas del archivo ${parsed.fileName}` });

  const missing = validateMapping(mapping);
  if (missing.length) throw new Error(`Faltan columnas necesarias: ${missing.join(", ")}`);
  steps.push({ label: "Validación", detail: "Columnas requeridas (Fecha y Cierre) presentes" });

  const num = (r: Row, key: FieldKey) => (mapping[key] ? toNumber(r[mapping[key]!]) : null);

  let dropped = 0;
  const interim = parsed.rows
    .map((r) => {
      const d = toDate(r[mapping.date!]);
      const close = num(r, "close");
      if (!d || close === null) {
        dropped++;
        return null;
      }
      return {
        date: d.toISOString().slice(0, 10),
        timestamp: d.getTime(),
        open: num(r, "open"),
        high: num(r, "high"),
        low: num(r, "low"),
        close,
        volume: num(r, "volume"),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  steps.push({ label: "Limpieza", detail: `${dropped} filas descartadas por fecha o cierre inválidos` });
  steps.push({ label: "Conversión de tipos", detail: "Fechas a Date y precios/volumen a número" });

  // null handling: forward-fill then fallback to close / 0
  let filled = 0;
  const keys = ["open", "high", "low", "volume"] as const;
  const last: Record<string, number | null> = { open: null, high: null, low: null, volume: null };
  const withFill = interim.map((r) => {
    const out: Record<string, number> = {};
    for (const k of keys) {
      let v = r[k];
      if (v === null || v === undefined) {
        filled++;
        v = last[k] ?? (k === "volume" ? 0 : r.close);
      }
      last[k] = v;
      out[k] = v;
    }
    return { ...r, ...(out as Record<(typeof keys)[number], number>) };
  });
  steps.push({ label: "Valores nulos", detail: `${filled} valores imputados (relleno hacia adelante)` });

  withFill.sort((a, b) => a.timestamp - b.timestamp);
  steps.push({ label: "Ordenamiento", detail: "Registros ordenados cronológicamente" });

  const rows: ProcessedRow[] = withFill.map((r, i, arr) => {
    const prev = i > 0 ? (arr[i - 1]?.close ?? r.close) : r.close;
    const variacion = prev !== 0 ? ((r.close - prev) / prev) * 100 : 0;
    return {
      date: r.date,
      timestamp: r.timestamp,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
      variacion,
      tendencia: (variacion > 0 ? 1 : 0) as 0 | 1,
    };
  });
  steps.push({ label: "Variación", detail: "Columna variación (%) calculada respecto al cierre anterior" });
  steps.push({
    label: "Tendencia",
    detail: `Columna Tendencia creada — ${rows.filter((r) => r.tendencia === 1).length} subidas / ${
      rows.filter((r) => r.tendencia === 0).length
    } bajadas`,
  });
  steps.push({ label: "Listo para ML", detail: `${rows.length} registros preparados para los modelos` });

  return { rows, steps };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function demoCsv(): { text: string; name: string } {
  const rows = ["Date,Open,High,Low,Close,Volume"];
  let price = 100;
  const start = new Date(2023, 0, 2).getTime();
  for (let i = 0; i < 500; i++) {
    const drift = Math.sin(i / 18) * 1.2 + (Math.random() - 0.48) * 2.2;
    const open = price;
    price = Math.max(5, price + drift);
    const close = price;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const vol = Math.round(800000 + Math.random() * 700000);
    const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
    rows.push(
      `${d},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${vol}`,
    );
  }
  return { text: rows.join("\n"), name: "datos_demostracion.csv" };
}
