# Body Composition Auto-Calculation Spec

**Project:** Progression App — Body Analytics Page
**Goal:** Automatically calculate Body Fat % and Lean Mass from the existing Log Body Entry form, replacing manual Body Fat % input.

---

## Context

The current `Log Body Entry` modal collects: weight, height, body fat %, waist, chest, arms, thighs, hips, notes.

Body fat % is currently a manual input. We want it **auto-calculated** using the US Navy method, with Lean Mass derived from it. Users with DEXA/InBody results can override.

---

## Required Form Changes

### Add to the Log Entry modal

1. **Neck (cm)** — new required input field, placed between Height and Waist
2. **Body Fat %** — change from input to **read-only display** (calculated live)
3. **Lean Mass (kg)** — new read-only display field
4. **BMI** — new read-only display field
5. **Override toggle** — small "Override Body Fat %" link/button below calculated results that reveals a manual input for users with DEXA scans

### Profile-level fields (capture once, store in user profile)

These should NOT be in the per-entry modal. Capture them once during onboarding or in a Settings/Profile screen:

- **Sex** — `'male' | 'female'` (required for Navy formula)
- **Age** or **Date of Birth** (required for Deurenberg fallback)
- **Height (cm)** — already likely in profile; reuse rather than asking each entry

If these aren't captured yet, build a one-time prompt the first time a user opens the Body tab.

---

## Calculation Logic

Create a new utility file at `src/utils/bodyComposition.ts`:

```typescript
type Sex = 'male' | 'female';

export interface BodyEntryInputs {
  weightKg: number;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number; // required for female
  sex: Sex;
  age: number;
  bodyFatOverride?: number; // for DEXA / InBody entries
}

export interface CalculatedBodyComposition {
  bodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  bmi: number;
  bmiCategory: 'underweight' | 'healthy' | 'overweight' | 'obese';
  method: 'navy' | 'deurenberg' | 'manual';
}

export function calculateBodyComposition(
  inputs: BodyEntryInputs
): CalculatedBodyComposition {
  const { weightKg, heightCm, neckCm, waistCm, hipCm, sex, age, bodyFatOverride } = inputs;

  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  let bodyFatPercent: number;
  let method: 'navy' | 'deurenberg' | 'manual';

  // Priority 1: Manual override (DEXA, InBody, hydrostatic)
  if (bodyFatOverride !== undefined && bodyFatOverride > 0) {
    bodyFatPercent = bodyFatOverride;
    method = 'manual';
  }
  // Priority 2: US Navy method (most accurate from tape measurements)
  else if (neckCm > 0 && waistCm > 0 && (sex === 'male' || (hipCm !== undefined && hipCm > 0))) {
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
  }
  // Priority 3: Deurenberg fallback (BMI-based)
  else {
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
    bmiCategory: getBmiCategory(bmi),
    method,
  };
}

function getBmiCategory(bmi: number): 'underweight' | 'healthy' | 'overweight' | 'obese' {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
```

---

## Modal Integration

Update the Log Body Entry modal to compute results live as the user types:

```typescript
import { useMemo } from 'react';
import { calculateBodyComposition } from '../utils/bodyComposition';

// Inside the component — pull sex/age/heightCm from profile state:
const liveCalculation = useMemo(() => {
  const weight = parseFloat(bodyLogForm.weightKg);
  const neck = parseFloat(bodyLogForm.neckCm);
  const waist = parseFloat(bodyLogForm.waistCm);
  const hip = parseFloat(bodyLogForm.hipsCm);
  const heightCm = parseFloat(bodyLogForm.heightCm) || profileHeightCm;

  if (!weight || !heightCm) return null;

  return calculateBodyComposition({
    weightKg: weight,
    heightCm,
    neckCm: neck || 0,
    waistCm: waist || 0,
    hipCm: hip || undefined,
    sex: profileSex,   // 'male' | 'female' from profile
    age: profileAge,   // number from profile
    bodyFatOverride: bodyLogForm.bodyFatOverride
      ? parseFloat(bodyLogForm.bodyFatOverride)
      : undefined,
  });
}, [bodyLogForm, profileSex, profileAge, profileHeightCm]);
```

---

## UI: Calculated Results Card

Add between measurement inputs and Notes field. Updates live as the user types.

```
┌──────────────────────────────────────────────────┐
│  CALCULATED                                       │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ BODY FAT │ │ LEAN MASS│ │   BMI    │          │
│  │  14.2 %  │ │  72.1 kg │ │   24.8   │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                   │
│  Method: US Navy                                  │
│                                                   │
│  ↓ Override Body Fat %                            │
└──────────────────────────────────────────────────┘
```

**Styling:**
- Card background: `#141414` (one shade lighter than modal bg)
- "CALCULATED" label: uppercase, letter-spacing `1.5px`, color `#8A8A8A`, font-size 11px
- Number values: 24–28px, bold, white
- Unit labels (`%`, `kg`): 14px, color `#8A8A8A`
- "Method: US Navy": small, `#8A8A8A`
- Override link: small, underlined, `#8A8A8A` → white on hover

**Empty state:** Show placeholder dashes (`—`) with helper text: *"Enter weight and neck circumference to see body composition."*

---

## Override Flow

When user taps "Override Body Fat %":
1. Reveal a numeric input below the calculated card
2. Label: `Body Fat % (from DEXA / InBody)`
3. Typing updates `bodyLogForm.bodyFatOverride`; calculation switches to `method: 'manual'`
4. "Method:" label updates to `Method: Manual entry`
5. Small "Clear" button reverts to auto-calc

---

## Persistence

Store the full calculated result with each entry, not just raw inputs:

```typescript
interface BodyEntryRecord {
  id: string;
  date: string; // ISO
  // Raw inputs
  weightKg: number;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  chestCm: number;
  armsCm: number;
  thighsCm: number;
  hipsCm: number;
  notes?: string;
  // Calculated values (snapshotted at save time)
  bodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  bmi: number;
  calculationMethod: 'navy' | 'deurenberg' | 'manual';
}
```

Storing calculated values means historical entries don't change if the formula is updated later.

---

## Body Analytics Page Updates

Once entries store calculated values, the Body comp sub-tab cards become trivial:

- **Body Fat card** — most recent entry's `bodyFatPercent` + sparkline of last 30 entries
- **Lean Mass card** — most recent entry's `leanMassKg` + sparkline
- **BMI bar** — most recent entry's `bmi` + category indicator (already built)

Period selector (7D / 1M / 3M / 6M / 1Y) works automatically with historical data.

### Bonus: Recomp detection

If recent trend shows weight stable (±1 kg over 30 days) AND body fat trending down AND lean mass trending up — display a small "Recomping" badge on the Body Fat card. Subtle tag, not gamified.

---

## Disclaimer Copy

Below the calculated results card in the modal:

> *Estimates use the US Navy method. For clinical-grade accuracy, use a DEXA or hydrostatic weighing and tap "Override".*

On the Body Analytics page near the Body Fat card (first visit, dismissible):

> *Body fat is estimated from your measurements. Track the trend, not the absolute number.*

---

## Reference: Formulas

**US Navy (men):**
```
BF% = 86.010 × log₁₀(waist - neck) - 70.041 × log₁₀(height) + 36.76
```

**US Navy (women):**
```
BF% = 163.205 × log₁₀(waist + hip - neck) - 97.684 × log₁₀(height) - 78.387
```

**Deurenberg (BMI-based fallback):**
```
BF% = (1.20 × BMI) + (0.23 × age) - (10.8 × sex) - 5.4
where sex = 1 (male), 0 (female)
```

**Lean Mass:**
```
fatMass = weight × (BF% / 100)
leanMass = weight - fatMass
```

All measurements in cm and kg. Waist measured at navel, neck just below larynx, hip at widest point.

---

## Quality Checklist

- [ ] `src/utils/bodyComposition.ts` utility with full TypeScript types
- [ ] Unit tests for calculation function (Navy male, Navy female, Deurenberg fallback, manual override, edge cases)
- [ ] Profile captures sex + age + height once (one-time prompt on first Body tab visit if missing)
- [ ] Modal updated with Neck input, calculated results card, override flow
- [ ] Live calculation updates as user types
- [ ] Empty / partial-fill states handled gracefully
- [ ] Calculated values persisted with each entry (requires DB migration to add neckCm, bodyFatPercent, leanMassKg, fatMassKg, calculationMethod columns to body_metrics)
- [ ] Body Analytics page reads from persisted calculated values
- [ ] Disclaimer copy added and dismissible on first visit
- [ ] Override flow tested with realistic DEXA values
