import { describe, expect, it } from 'vitest';
import { frameCountForRow, inspectCodexSpriteDimensions } from '../src/domain/custom-pet';
import { migrateCustomPetAsset } from '../src/domain/storage-schema';

describe('Codex custom pet compatibility', () => {
  it('recognizes the supported v1 and v2 sprite sheet dimensions', () => {
    expect(inspectCodexSpriteDimensions(1_536, 1_872)).toEqual({ spriteVersion: 1, rows: 9 });
    expect(inspectCodexSpriteDimensions(1_536, 2_288)).toEqual({ spriteVersion: 2, rows: 11 });
    expect(inspectCodexSpriteDimensions(1_535, 1_872)).toBeNull();
    expect(inspectCodexSpriteDimensions(1_536, 2_000)).toBeNull();
  });

  it('uses Codex frame-count rules without requesting unused cells', () => {
    expect(frameCountForRow(0)).toBe(6);
    expect(frameCountForRow(3)).toBe(4);
    expect(frameCountForRow(8)).toBe(6);
    expect(frameCountForRow(99)).toBe(6);
  });

  it('keeps a valid local custom pet asset typed and local-only', () => {
    const asset = {
      schemaVersion: 1 as const,
      name: 'zhaolaosi',
      spriteVersion: 2 as const,
      dataUrl: 'data:image/png;base64,AA==',
      importedAt: 1_000
    };
    expect(migrateCustomPetAsset(asset)).toEqual({ status: 'current', value: asset });
  });
});
