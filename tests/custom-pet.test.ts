import { describe, expect, it } from 'vitest';
import {
  animationForMood,
  animationForMovement,
  animationForRoamingState,
  CODEX_SPRITE_CELL_HEIGHT,
  CODEX_SPRITE_FRAME_COUNTS,
  CODEX_SPRITE_WIDTH,
  coordinatesForAnimation,
  frameCountForRow,
  inspectCodexSpriteCells,
  inspectCodexSpriteDimensions
} from '../src/domain/custom-pet';
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
    expect(frameCountForRow(9)).toBe(8);
    expect(frameCountForRow(10)).toBe(8);
    expect(frameCountForRow(99)).toBe(6);
  });

  it('selects the actual directional row from horizontal movement', () => {
    expect(animationForMovement({ x: 20 }, { x: 80 })).toBe('running-right');
    expect(animationForMovement({ x: 80 }, { x: 20 })).toBe('running-left');
    expect(animationForMovement({ x: 20 }, { x: 20 }, 'left')).toBe('running-left');
  });

  it('crops the right and left running rows without mirroring', () => {
    expect(coordinatesForAnimation('running-right', 0, 1)).toMatchObject({
      row: 1,
      rowPositionPercent: 12.5,
      framePositionPercent: 0
    });
    expect(coordinatesForAnimation('running-left', 7, 1)).toMatchObject({
      row: 2,
      rowPositionPercent: 25,
      framePositionPercent: 100
    });
    expect(coordinatesForAnimation('running-left', 99, 2)).toMatchObject({
      row: 2,
      frame: 7,
      rowPositionPercent: 20
    });
  });

  it('uses the fixed eight-column atlas when an animation has fewer frames', () => {
    expect(coordinatesForAnimation('idle', 5, 1)).toMatchObject({
      frame: 5,
      framePositionPercent: (5 / 7) * 100
    });
    expect(coordinatesForAnimation('waving', 3, 1)).toMatchObject({
      frame: 3,
      framePositionPercent: (3 / 7) * 100
    });
    expect(coordinatesForAnimation('jumping', 4, 1)).toMatchObject({
      frame: 4,
      framePositionPercent: (4 / 7) * 100
    });
    expect(coordinatesForAnimation('review', 99, 2)).toMatchObject({
      frame: 5,
      framePositionPercent: (5 / 7) * 100
    });
  });

  it('keeps movement above mood and temporary actions', () => {
    expect(animationForRoamingState({
      moving: true,
      direction: 'left',
      action: 'wave',
      mood: 'celebrating'
    })).toBe('running-left');
    expect(animationForRoamingState({
      moving: true,
      direction: 'right',
      action: 'alert',
      mood: 'overwhelmed'
    })).toBe('running-right');
  });

  it('maps stationary moods and actions to semantic Codex rows', () => {
    expect(animationForMood('calm')).toBe('idle');
    expect(animationForMood('curious')).toBe('waiting');
    expect(animationForMood('busy')).toBe('running');
    expect(animationForMood('overwhelmed')).toBe('failed');
    expect(animationForMood('celebrating')).toBe('jumping');
    expect(animationForRoamingState({ moving: false, direction: 'right', action: 'wave', mood: 'calm' })).toBe('waving');
    expect(animationForRoamingState({ moving: false, direction: 'right', action: 'selected', mood: 'calm' })).toBe('waiting');
  });

  it('rejects missing required cells and visible unused cells', () => {
    const rows = 9;
    const height = rows * CODEX_SPRITE_CELL_HEIGHT;
    const rgba = new Uint8ClampedArray(CODEX_SPRITE_WIDTH * height * 4);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < CODEX_SPRITE_FRAME_COUNTS[row]!; column += 1) {
        const x = column * 192 + 1;
        const y = row * CODEX_SPRITE_CELL_HEIGHT + 1;
        rgba[(y * CODEX_SPRITE_WIDTH + x) * 4 + 3] = 255;
      }
    }
    expect(inspectCodexSpriteCells(rgba, { spriteVersion: 1, rows })).toEqual([]);

    rgba[(1 * CODEX_SPRITE_WIDTH + 1) * 4 + 3] = 0;
    const unusedX = 7 * 192 + 1;
    rgba[(1 * CODEX_SPRITE_WIDTH + unusedX) * 4 + 3] = 255;
    expect(inspectCodexSpriteCells(rgba, { spriteVersion: 1, rows })).toEqual([
      { row: 0, column: 0, kind: 'required-empty' },
      { row: 0, column: 7, kind: 'unused-visible' }
    ]);
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
