import type { WeightUnit } from './preferences';

const LB_PER_KG = 2.2046226218;

export function fromKg(kg: number, unit: WeightUnit) {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

export function toKg(value: number, unit: WeightUnit) {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, digits = 1) {
  if (kg == null || !Number.isFinite(Number(kg))) return null;
  return `${fromKg(Number(kg), unit).toFixed(digits)} ${unit}`;
}

export function parseWeightInput(raw: string, unit: WeightUnit) {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(toKg(n, unit) * 10) / 10;
}
