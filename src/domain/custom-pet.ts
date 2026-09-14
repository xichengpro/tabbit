import type { CodexSpriteVersion, PetMood } from './models';

export const CODEX_SPRITE_WIDTH = 1_536;
export const CODEX_SPRITE_CELL_WIDTH = 192;
export const CODEX_SPRITE_CELL_HEIGHT = 208;
export const CODEX_SPRITE_COLUMNS = 8;
export const CODEX_SPRITE_FRAME_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8] as const;

export type CodexAnimation =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

export type MovementDirection = 'left' | 'right';

export type RoamingVisualAction = 'idle' | 'hop' | 'wave' | 'nap' | 'alert' | 'flee' | 'selected';

export interface CodexAnimationMetadata {
  row: number;
  frameCount: number;
  frameDurationMs: number;
}

export const CODEX_ANIMATIONS: Record<CodexAnimation, CodexAnimationMetadata> = {
  idle: { row: 0, frameCount: 6, frameDurationMs: 220 },
  'running-right': { row: 1, frameCount: 8, frameDurationMs: 110 },
  'running-left': { row: 2, frameCount: 8, frameDurationMs: 110 },
  waving: { row: 3, frameCount: 4, frameDurationMs: 180 },
  jumping: { row: 4, frameCount: 5, frameDurationMs: 140 },
  failed: { row: 5, frameCount: 8, frameDurationMs: 180 },
  waiting: { row: 6, frameCount: 6, frameDurationMs: 220 },
  running: { row: 7, frameCount: 6, frameDurationMs: 150 },
  review: { row: 8, frameCount: 6, frameDurationMs: 200 }
};

export interface CodexSpriteMetadata {
  spriteVersion: CodexSpriteVersion;
  rows: number;
}

export interface CodexSpriteCellIssue {
  row: number;
  column: number;
  kind: 'required-empty' | 'unused-visible';
}

export interface CodexSpriteCoordinates {
  frame: number;
  framePositionPercent: number;
  row: number;
  rowPositionPercent: number;
}

export function inspectCodexSpriteDimensions(width: number, height: number): CodexSpriteMetadata | null {
  if (width !== CODEX_SPRITE_WIDTH) return null;
  if (height === 1_872) return { spriteVersion: 1, rows: 9 };
  if (height === 2_288) return { spriteVersion: 2, rows: 11 };
  return null;
}

export function frameCountForRow(row: number): number {
  return CODEX_SPRITE_FRAME_COUNTS[row] ?? CODEX_ANIMATIONS.idle.frameCount;
}

export function inspectCodexSpriteCells(
  rgba: Uint8ClampedArray,
  metadata: CodexSpriteMetadata
): CodexSpriteCellIssue[] {
  const expectedLength = CODEX_SPRITE_WIDTH * metadata.rows * CODEX_SPRITE_CELL_HEIGHT * 4;
  if (rgba.length !== expectedLength) {
    return [{ row: 0, column: 0, kind: 'required-empty' }];
  }

  const issues: CodexSpriteCellIssue[] = [];
  for (let row = 0; row < metadata.rows; row += 1) {
    const requiredFrames = frameCountForRow(row);
    for (let column = 0; column < 8; column += 1) {
      let visible = false;
      const startX = column * CODEX_SPRITE_CELL_WIDTH;
      const startY = row * CODEX_SPRITE_CELL_HEIGHT;
      for (let y = startY; y < startY + CODEX_SPRITE_CELL_HEIGHT && !visible; y += 1) {
        for (let x = startX; x < startX + CODEX_SPRITE_CELL_WIDTH; x += 1) {
          if (rgba[(y * CODEX_SPRITE_WIDTH + x) * 4 + 3] !== 0) {
            visible = true;
            break;
          }
        }
      }
      const required = column < requiredFrames;
      if (required !== visible) {
        issues.push({ row, column, kind: required ? 'required-empty' : 'unused-visible' });
      }
    }
  }
  return issues;
}

export function animationForMovement(
  from: { x: number },
  to: { x: number },
  fallback: MovementDirection = 'right'
): Extract<CodexAnimation, 'running-left' | 'running-right'> {
  const direction = to.x === from.x ? fallback : to.x < from.x ? 'left' : 'right';
  return direction === 'left' ? 'running-left' : 'running-right';
}

export function animationForMood(mood: PetMood): CodexAnimation {
  return {
    sleeping: 'idle',
    calm: 'idle',
    curious: 'waiting',
    busy: 'running',
    overwhelmed: 'failed',
    celebrating: 'jumping'
  }[mood] as CodexAnimation;
}

export function animationForRoamingState(input: {
  moving: boolean;
  direction: MovementDirection;
  action: RoamingVisualAction;
  mood: PetMood;
}): CodexAnimation {
  if (input.moving) return input.direction === 'left' ? 'running-left' : 'running-right';
  switch (input.action) {
    case 'wave': return 'waving';
    case 'hop': return 'jumping';
    case 'alert': return input.mood === 'overwhelmed' ? 'failed' : 'waiting';
    case 'selected': return 'waiting';
    case 'nap':
    case 'flee':
    case 'idle': return animationForMood(input.mood);
  }
}

export function coordinatesForAnimation(
  animation: CodexAnimation,
  frame: number,
  spriteVersion: CodexSpriteVersion
): CodexSpriteCoordinates {
  const { row, frameCount } = CODEX_ANIMATIONS[animation];
  const normalizedFrame = Math.max(0, Math.min(frameCount - 1, Math.trunc(frame)));
  const rowCount = spriteVersion === 1 ? 9 : 11;
  return {
    frame: normalizedFrame,
    // The atlas is always eight columns wide. frameCount only controls when the
    // animation loops; it must not change which physical column is cropped.
    framePositionPercent: (normalizedFrame / (CODEX_SPRITE_COLUMNS - 1)) * 100,
    row,
    rowPositionPercent: (row / (rowCount - 1)) * 100
  };
}
