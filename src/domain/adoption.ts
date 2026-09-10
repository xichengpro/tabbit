export interface AdoptionInput {
  name: string;
  softTabLimit: number;
  hardTabLimit: number;
}

export interface AdoptionPreset {
  id: 'light' | 'daily' | 'heavy';
  labelKey: `adoption.preset.${AdoptionPreset['id']}.label`;
  descriptionKey: `adoption.preset.${AdoptionPreset['id']}.description`;
  softTabLimit: number;
  hardTabLimit: number;
}

export type AdoptionValidationKey =
  | 'validation.name'
  | 'validation.softLimit'
  | 'validation.hardLimit'
  | 'validation.limitOrder';

export const ADOPTION_PRESETS: AdoptionPreset[] = [
  { id: 'light', labelKey: 'adoption.preset.light.label', descriptionKey: 'adoption.preset.light.description', softTabLimit: 10, hardTabLimit: 30 },
  { id: 'daily', labelKey: 'adoption.preset.daily.label', descriptionKey: 'adoption.preset.daily.description', softTabLimit: 20, hardTabLimit: 50 },
  { id: 'heavy', labelKey: 'adoption.preset.heavy.label', descriptionKey: 'adoption.preset.heavy.description', softTabLimit: 50, hardTabLimit: 120 }
];

export function sanitizePetName(value: string): string {
  return value.normalize('NFC').replace(/[\p{C}]/gu, '').trim();
}

export function validateAdoption(input: AdoptionInput): AdoptionValidationKey | null {
  const nameLength = Array.from(sanitizePetName(input.name)).length;
  if (nameLength < 1 || nameLength > 12) return 'validation.name';
  return validateTabLimits(input.softTabLimit, input.hardTabLimit);
}

export function validateTabLimits(
  softTabLimit: number,
  hardTabLimit: number
): Exclude<AdoptionValidationKey, 'validation.name'> | null {
  if (!Number.isInteger(softTabLimit) || softTabLimit < 5 || softTabLimit > 300) {
    return 'validation.softLimit';
  }
  if (!Number.isInteger(hardTabLimit) || hardTabLimit < 10 || hardTabLimit > 300) {
    return 'validation.hardLimit';
  }
  if (hardTabLimit <= softTabLimit) return 'validation.limitOrder';
  return null;
}
