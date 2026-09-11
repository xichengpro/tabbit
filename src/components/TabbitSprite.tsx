import { useEffect, useRef, useState } from 'react';
import { frameCountForRow } from '../domain/custom-pet';
import type { CustomPetAsset } from '../domain/models';

export type SpriteState = 'calm' | 'curious' | 'busy' | 'overwhelmed';

interface TabbitSpriteProps {
  state: SpriteState;
  label: string;
  reducedMotion?: boolean;
  customPet?: CustomPetAsset | undefined;
}

function customPetRow(state: SpriteState): number {
  return { calm: 0, curious: 1, busy: 2, overwhelmed: 3 }[state];
}

export default function TabbitSprite({ state, label, reducedMotion = false, customPet }: TabbitSpriteProps) {
  const spriteRef = useRef<SVGSVGElement>(null);
  const customPetRef = useRef<HTMLDivElement>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();

    const node = customPet ? customPetRef.current : spriteRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry?.isIntersecting ?? true));
    observer.observe(node);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
    };
  }, [customPet]);

  const paused = reducedMotion || !pageVisible || !inViewport;
  const row = customPetRow(state);
  const frameCount = frameCountForRow(row);
  useEffect(() => {
    setFrame(0);
    if (!customPet || paused) return;
    const timer = setInterval(() => setFrame((current) => (current + 1) % frameCount), 150);
    return () => clearInterval(timer);
  }, [customPet, frameCount, paused, row]);

  if (customPet) {
    const framePosition = frameCount > 1 ? (frame / (frameCount - 1)) * 100 : 0;
    const rowPosition = customPet.spriteVersion === 1 ? (row / 8) * 100 : (row / 10) * 100;
    return (
      <div
        ref={customPetRef}
        className={`customPetSprite${paused ? ' customPetSprite--paused' : ''}`}
        role="img"
        aria-label={label}
        style={{
          backgroundImage: `url("${customPet.dataUrl}")`,
          backgroundSize: `800% ${customPet.spriteVersion === 1 ? 900 : 1100}%`,
          backgroundPosition: `${framePosition}% ${rowPosition}%`
        }}
      />
    );
  }
  return (
    <svg
      ref={spriteRef}
      className={`tabbitSprite sprite-${state}${paused ? ' tabbitSprite--paused' : ''}`}
      viewBox="0 0 160 160"
      role="img"
      aria-label={label}
    >
      <ellipse className="spriteShadow" cx="80" cy="137" rx="43" ry="8" />
      <g className="spritePaper spritePaperBack" aria-hidden="true">
        <path d="M25 99c9-13 23-18 35-13l7 31H29z" />
        <path d="M100 83c15-8 28-3 36 12l-7 23-31-12z" />
      </g>
      <g className="spriteBody">
        <path className="spriteEar spriteEarLeft" d="M48 61C27 49 27 16 43 11c19 7 23 29 17 52z" />
        <path className="spriteEar spriteEarRight" d="M112 61c21-12 21-45 5-50-19 7-23 29-17 52z" />
        <ellipse className="spriteBodyFill" cx="80" cy="91" rx="48" ry="40" />
        <ellipse className="spriteBelly" cx="80" cy="111" rx="27" ry="20" />
        <circle className="spriteEye" cx="62" cy="84" r="5" />
        <circle className="spriteEye" cx="98" cy="84" r="5" />
        <path className="spriteMuzzle" d="M73 94q7 7 14 0q-7 14-14 0z" />
        <circle className="spriteCheek" cx="51" cy="98" r="6" />
        <circle className="spriteCheek" cx="109" cy="98" r="6" />
        <path className="spriteFoot" d="M45 125q15-8 28 4q-12 11-28 4z" />
        <path className="spriteFoot" d="M115 125q-15-8-28 4q12 11 28 4z" />
      </g>
      <g className="spritePaper spritePaperFront" aria-hidden="true">
        <path d="M26 119h22l-4 17H21z" />
        <path d="M112 117h22l5 19h-28z" />
      </g>
      {state === 'curious' && <path className="spriteQuestion" d="M123 39q13-13 21 0q2 8-7 12v6" />}
      {state === 'busy' && (
        <g className="spriteBusyMark" aria-hidden="true">
          <path d="M20 45l8-5m-5 15l9-1m108-8l-8-5m5 15l-9-1" />
        </g>
      )}
      {state === 'overwhelmed' && <path className="spriteSweat" d="M125 67q7 9 0 15q-7-6 0-15z" aria-hidden="true" />}
    </svg>
  );
}
