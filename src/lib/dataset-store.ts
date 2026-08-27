import { useSyncExternalStore } from "react";
import {
  parseCsv,
  profileCsv,
  processDataset,
  type CsvProfile,
  type Mapping,
  type ParsedCsv,
  type ProcessedRow,
} from "./csv";

export interface DatasetState {
  parsed: ParsedCsv | null;
  profile: CsvProfile | null;
  mapping: Mapping | null;
  processed: ProcessedRow[] | null;
  steps: { label: string; detail: string }[];
  isDemo: boolean;
}

const EMPTY: DatasetState = {
  parsed: null,
  profile: null,
  mapping: null,
  processed: null,
  steps: [],
  isDemo: false,
};

const KEY = "finml.dataset.v1";

let state: DatasetState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* dataset too large for sessionStorage — keep in memory only */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as DatasetState) };
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setState(next: Partial<DatasetState>) {
  state = { ...state, ...next };
  persist();
  emit();
}

export function loadCsvText(text: string, fileName: string, fileSize: number, isDemo = false) {
  const parsed = parseCsv(text, fileName, fileSize);
  const profile = profileCsv(parsed);
  setState({ parsed, profile, mapping: null, processed: null, steps: [], isDemo });
  return { parsed, profile };
}

export function runProcessing(mapping: Mapping) {
  if (!state.parsed) throw new Error("No hay ningún CSV cargado.");
  const { rows, steps } = processDataset(state.parsed, mapping);
  setState({ mapping, processed: rows, steps });
  return rows;
}

export function clearDataset() {
  state = EMPTY;
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
  emit();
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  hydrate();
  return state;
}

export function useDataset(): DatasetState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
