import type { CodexSpriteVersion } from './models';

export const CODEX_SPRITE_WIDTH = 1_536;
export const CODEX_SPRITE_CELL_WIDTH = 192;
export const CODEX_SPRITE_CELL_HEIGHT = 208;
export const CODEX_SPRITE_FRAME_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6] as const;

export interface CodexSpriteMetadata {
  spriteVersion: CodexSpriteVersion;
  rows: number;
}

export function inspectCodexSpriteDimensions(width: number, height: number): CodexSpriteMetadata | null {
  if (width !== CODEX_SPRITE_WIDTH) return null;
  if (height === 1_872) return { spriteVersion: 1, rows: 9 };
  if (height === 2_288) return { spriteVersion: 2, rows: 11 };
  return null;
}

export function frameCountForRow(row: number): number {
  return CODEX_SPRITE_FRAME_COUNTS[Math.max(0, Math.min(CODEX_SPRITE_FRAME_COUNTS.length - 1, row))] ?? 6;
}
