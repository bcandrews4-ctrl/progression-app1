export type Sex = 'male' | 'female';

export interface BodyCompositionInputs {
  weightKg: number;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
  sex: Sex;
  age: number;
  bodyFatOverride?: number;
}

export interface BodyCompositionResult {
  bodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  bmi: number;
  bmiCategory: 'underweight' | 'healthy' | 'overweight' | 'obese';
  method: 'navy' | 'deurenberg' | 'manual';
}

export function calculateBodyComposition(inputs: BodyCompositionInputs): BodyCompositionResult {
  const { weightKg, heightCm, neckCm, waistCm, hipCm, sex, age, bodyFatOverride } = inputs;

  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  let bodyFatPercent: number;
  let method: 'navy' | 'deurenberg' | 'manual';

  if (bodyFatOverride !== undefined && bodyFatOverride > 0) {
    bodyFatPercent = bodyFatOverride;
    method = 'manual';
  } else if (neckCm > 0 && waistCm > 0 && (sex === 'male' || (hipCm !== undefined && hipCm > 0))) {
    if (sex === 'male') {
      bodyFatPercent =
        86.010 * Math.log10(waistCm - neckCm) -
        70.041 * Math.log10(heightCm) +
        36.76;
    } else {
      bodyFatPercent =
        163.205 * Math.log10(waistCm + (hipCm ?? 0) - neckCm) -
        97.684 * Math.log10(heightCm) -
        78.387;
    }
    method = 'navy';
  } else {
    const sexBinary = sex === 'male' ? 1 : 0;
    bodyFatPercent = 1.20 * bmi + 0.23 * age - 10.8 * sexBinary - 5.4;
    method = 'deurenberg';
  }

  bodyFatPercent = Math.max(3, Math.min(60, bodyFatPercent));
  bodyFatPercent = Math.round(bodyFatPercent * 10) / 10;

  const fatMassKg = weightKg * (bodyFatPercent / 100);
  const leanMassKg = weightKg - fatMassKg;

  return {
    bodyFatPercent,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: bmi < 18.5 ? 'underweight' : bmi < 25 ? 'healthy' : bmi < 30 ? 'overweight' : 'obese',
    method,
  };
}
