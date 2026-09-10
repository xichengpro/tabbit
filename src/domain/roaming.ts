import type { PetMood } from './models';

export interface RoamingPoint {
  x: number;
  y: number;
}

export interface RoamingViewport {
  width: number;
  height: number;
}

export type RoamingAction = 'idle' | 'hop' | 'wave' | 'nap' | 'alert' | 'flee' | 'selected';

export const ROAMING_PET_SIZE = 112;
export const ROAMING_PADDING = 12;

function axisMaximum(length: number, size: number, padding: number): number {
  return Math.max(padding, length - size - padding);
}

export function clampRoamingPoint(
  point: RoamingPoint,
  viewport: RoamingViewport,
  size = ROAMING_PET_SIZE,
  padding = ROAMING_PADDING
): RoamingPoint {
  return {
    x: Math.min(axisMaximum(viewport.width, size, padding), Math.max(padding, point.x)),
    y: Math.min(axisMaximum(viewport.height, size, padding), Math.max(padding, point.y))
  };
}

export function chooseRoamingTarget(
  viewport: RoamingViewport,
  current: RoamingPoint,
  random: () => number = Math.random
): RoamingPoint {
  const maxX = axisMaximum(viewport.width, ROAMING_PET_SIZE, ROAMING_PADDING);
  const maxY = axisMaximum(viewport.height, ROAMING_PET_SIZE, ROAMING_PADDING);
  let candidate = current;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    candidate = {
      x: ROAMING_PADDING + random() * Math.max(0, maxX - ROAMING_PADDING),
      y: ROAMING_PADDING + random() * Math.max(0, maxY - ROAMING_PADDING)
    };
    if (Math.hypot(candidate.x - current.x, candidate.y - current.y) >= 120) break;
  }
  return clampRoamingPoint(candidate, viewport);
}

export function chooseFleeTarget(
  viewport: RoamingViewport,
  pointer: RoamingPoint,
  random: () => number = Math.random
): RoamingPoint {
  const maxX = axisMaximum(viewport.width, ROAMING_PET_SIZE, ROAMING_PADDING);
  const maxY = axisMaximum(viewport.height, ROAMING_PET_SIZE, ROAMING_PADDING);
  const corners: RoamingPoint[] = [
    { x: ROAMING_PADDING, y: ROAMING_PADDING },
    { x: maxX, y: ROAMING_PADDING },
    { x: ROAMING_PADDING, y: maxY },
    { x: maxX, y: maxY }
  ];
  const farthest = corners.sort((left, right) => {
    const leftDistance = (left.x - pointer.x) ** 2 + (left.y - pointer.y) ** 2;
    const rightDistance = (right.x - pointer.x) ** 2 + (right.y - pointer.y) ** 2;
    return rightDistance - leftDistance;
  })[0]!;
  const jitter = 24 * random();
  return clampRoamingPoint({
    x: farthest.x === ROAMING_PADDING ? farthest.x + jitter : farthest.x - jitter,
    y: farthest.y === ROAMING_PADDING ? farthest.y + jitter : farthest.y - jitter
  }, viewport);
}

export function chooseMoodAction(mood: PetMood, random: () => number = Math.random): RoamingAction {
  switch (mood) {
    case 'sleeping': return 'nap';
    case 'calm': return random() < 0.55 ? 'nap' : 'wave';
    case 'curious': return random() < 0.5 ? 'wave' : 'hop';
    case 'busy': return 'hop';
    case 'overwhelmed': return 'alert';
    case 'focused': return 'idle';
    case 'celebrating': return 'hop';
  }
}
