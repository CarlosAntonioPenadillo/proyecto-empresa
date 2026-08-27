import type { ProcessedRow } from "./csv";

export interface Sample {
  x: number[];
  y: number;
}

export const FEATURE_NAMES = ["ret_1", "ret_2", "ret_3", "ma5_ratio", "vol_ratio", "volatilidad_5"];

const at = (arr: number[], i: number) => arr[i] ?? 0;

export function buildFeatures(rows: ProcessedRow[]): { samples: Sample[]; latest: number[] | null } {
  const closes = rows.map((r) => r.close);
  const vols = rows.map((r) => r.volume);
  const rets = closes.map((c, i) => (i === 0 ? 0 : (c - at(closes, i - 1)) / (at(closes, i - 1) || 1)));

  const featureAt = (i: number): number[] => {
    const ma5 = closes.slice(Math.max(0, i - 4), i + 1).reduce((a, b) => a + b, 0) / Math.min(5, i + 1);
    const volMa5 = vols.slice(Math.max(0, i - 4), i + 1).reduce((a, b) => a + b, 0) / Math.min(5, i + 1);
    const window = rets.slice(Math.max(0, i - 4), i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / (window.length || 1);
    const vola = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / (window.length || 1));
    return [
      at(rets, i),
      at(rets, i - 1),
      at(rets, i - 2),
      ma5 ? at(closes, i) / ma5 - 1 : 0,
      volMa5 ? at(vols, i) / volMa5 - 1 : 0,
      vola,
    ];
  };

  const samples: Sample[] = [];
  for (let i = 3; i < rows.length - 1; i++) {
    samples.push({ x: featureAt(i), y: rows[i + 1]?.tendencia ?? 0 });
  }
  const latest = rows.length > 4 ? featureAt(rows.length - 1) : null;
  return { samples, latest };
}

export function standardize(samples: Sample[], latest: number[] | null) {
  const d = FEATURE_NAMES.length;
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(1);
  for (let j = 0; j < d; j++) {
    const col = samples.map((s) => at(s.x, j));
    const m = col.reduce((a, b) => a + b, 0) / (col.length || 1);
    const sd = Math.sqrt(col.reduce((a, b) => a + (b - m) ** 2, 0) / (col.length || 1)) || 1;
    mean[j] = m;
    std[j] = sd;
  }
  const norm = (x: number[]) => x.map((v, j) => (v - at(mean, j)) / at(std, j));
  return {
    samples: samples.map((s) => ({ x: norm(s.x), y: s.y })),
    latest: latest ? norm(latest) : null,
  };
}

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: { tp: number; tn: number; fp: number; fn: number };
}

export function evaluate(yTrue: number[], yPred: number[]): Metrics {
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  yTrue.forEach((y, i) => {
    const p = at(yPred, i);
    if (y === 1 && p === 1) tp++;
    else if (y === 0 && p === 0) tn++;
    else if (y === 0 && p === 1) fp++;
    else fn++;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  return {
    accuracy: yTrue.length ? (tp + tn) / yTrue.length : 0,
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    confusion: { tp, tn, fp, fn },
  };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/* Regresión logística (descenso de gradiente) */
export function trainLogistic(train: Sample[], epochs = 400, lr = 0.15) {
  const d = FEATURE_NAMES.length;
  let w = new Array(d).fill(0);
  let b = 0;
  const loss: number[] = [];
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    let l = 0;
    for (const s of train) {
      const z = s.x.reduce((acc, v, j) => acc + v * at(w, j), b);
      const p = sigmoid(z);
      const err = p - s.y;
      for (let j = 0; j < d; j++) gw[j] += err * at(s.x, j);
      gb += err;
      l += -(s.y * Math.log(p + 1e-9) + (1 - s.y) * Math.log(1 - p + 1e-9));
    }
    const n = train.length || 1;
    w = w.map((v, j) => v - (lr * at(gw, j)) / n);
    b -= (lr * gb) / n;
    if (e % 10 === 0) loss.push(l / n);
  }
  const predictProba = (x: number[]) => sigmoid(x.reduce((acc, v, j) => acc + v * at(w, j), b));
  return { predictProba, weights: w, bias: b, loss };
}

/* Red neuronal densa 6-8-1 (equivalente en navegador a un MLP de PyTorch/Keras) */
export function trainMLP(train: Sample[], hidden = 8, epochs = 300, lr = 0.08) {
  const d = FEATURE_NAMES.length;
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed / 2147483648) * 2 - 1;
  };
  let W1 = Array.from({ length: hidden }, () => Array.from({ length: d }, () => rand() * 0.5));
  let b1 = new Array(hidden).fill(0);
  let W2 = Array.from({ length: hidden }, () => rand() * 0.5);
  let b2 = 0;
  const loss: number[] = [];

  const forward = (x: number[]) => {
    const h = W1.map((row, k) => Math.tanh(row.reduce((acc, v, j) => acc + v * at(x, j), at(b1, k))));
    const z = h.reduce((acc, hv, k) => acc + hv * at(W2, k), b2);
    return { h, p: sigmoid(z) };
  };

  for (let e = 0; e < epochs; e++) {
    let l = 0;
    for (const s of train) {
      const { h, p } = forward(s.x);
      const err = p - s.y;
      l += -(s.y * Math.log(p + 1e-9) + (1 - s.y) * Math.log(1 - p + 1e-9));
      const newW2 = W2.map((v, k) => v - lr * err * at(h, k));
      b2 -= lr * err;
      W1 = W1.map((row, k) => {
        const dh = err * at(W2, k) * (1 - at(h, k) ** 2);
        b1[k] = at(b1, k) - lr * dh;
        return row.map((v, j) => v - lr * dh * at(s.x, j));
      });
      W2 = newW2;
    }
    if (e % 10 === 0) loss.push(l / (train.length || 1));
  }
  return { predictProba: (x: number[]) => forward(x).p, loss };
}

/* Baseline de momentum: la tendencia de mañana repite la de hoy */
export function baselineProba(x: number[]) {
  return at(x, 0) > 0 ? 0.66 : 0.34;
}

export interface ModelResult {
  name: string;
  description: string;
  metrics: Metrics;
  loss: number[];
  nextProbability: number;
  testProbas: number[];
}

export interface TrainingReport {
  trainSize: number;
  testSize: number;
  testDates: string[];
  testActual: number[];
  models: ModelResult[];
}

export function runModels(rows: ProcessedRow[]): TrainingReport {
  const built = buildFeatures(rows);
  const { samples, latest } = standardize(built.samples, built.latest);
  const split = Math.max(1, Math.floor(samples.length * 0.8));
  const train = samples.slice(0, split);
  const test = samples.slice(split);
  const testDates = rows.slice(3 + split + 1, 3 + samples.length + 1).map((r) => r.date);
  const testActual = test.map((s) => s.y);

  const logistic = trainLogistic(train);
  const mlp = trainMLP(train);

  const make = (
    name: string,
    description: string,
    proba: (x: number[]) => number,
    loss: number[],
  ): ModelResult => {
    const testProbas = test.map((s) => proba(s.x));
    const preds = testProbas.map((p) => (p >= 0.5 ? 1 : 0));
    return {
      name,
      description,
      metrics: evaluate(testActual, preds),
      loss,
      nextProbability: latest ? proba(latest) : 0.5,
      testProbas,
    };
  };

  return {
    trainSize: train.length,
    testSize: test.length,
    testDates,
    testActual,
    models: [
      make("Regresión logística", "Modelo lineal entrenado con descenso de gradiente", logistic.predictProba, logistic.loss),
      make("Red neuronal (MLP 6-8-1)", "Red densa con activación tanh, backpropagation", mlp.predictProba, mlp.loss),
      make("Baseline momentum", "Regla simple: repite la tendencia del día anterior", baselineProba, []),
    ],
  };
}
