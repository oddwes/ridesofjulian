export type WeightUnit = 'kg' | 'lb';

export const lbsToKg = (lbs: number) => Math.round(lbs * 0.453592 * 10) / 10;

export const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;

export const getDisplayWeight = (
  weightInLbs: number | undefined | null,
  unit: WeightUnit
): number | '' => {
  if (!weightInLbs) return '';
  return unit === 'kg' ? lbsToKg(weightInLbs) : weightInLbs;
};

export const normalizeWeightInput = (input: number, unit: WeightUnit): number => {
  if (Number.isNaN(input) || input <= 0) return 0;
  return unit === 'kg' ? kgToLbs(input) : input;
};


