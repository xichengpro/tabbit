export interface AdoptionInput {
  name: string;
  softTabLimit: number;
  hardTabLimit: number;
}

export interface AdoptionPreset {
  id: 'light' | 'daily' | 'heavy';
  label: string;
  description: string;
  softTabLimit: number;
  hardTabLimit: number;
}

export const ADOPTION_PRESETS: AdoptionPreset[] = [
  { id: 'light', label: '轻装', description: '适合习惯随手关标签的人', softTabLimit: 10, hardTabLimit: 30 },
  { id: 'daily', label: '日常', description: '适合一般工作和学习节奏', softTabLimit: 20, hardTabLimit: 50 },
  { id: 'heavy', label: '重度', description: '适合研究、开发和资料收集', softTabLimit: 50, hardTabLimit: 120 }
];

export function sanitizePetName(value: string): string {
  return value.normalize('NFC').replace(/[\p{C}]/gu, '').trim();
}

export function validateAdoption(input: AdoptionInput): string | null {
  const nameLength = Array.from(sanitizePetName(input.name)).length;
  if (nameLength < 1 || nameLength > 12) return '名字请使用 1–12 个可见字符。';
  if (!Number.isInteger(input.softTabLimit) || input.softTabLimit < 5 || input.softTabLimit > 300) {
    return '舒适数量需在 5 到 300 之间。';
  }
  if (!Number.isInteger(input.hardTabLimit) || input.hardTabLimit < 10 || input.hardTabLimit > 300) {
    return '拥挤数量需在 10 到 300 之间。';
  }
  if (input.hardTabLimit <= input.softTabLimit) return '拥挤数量需要大于舒适数量。';
  return null;
}
