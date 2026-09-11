import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import TabbitSprite, { type SpriteState } from '../components/TabbitSprite';
import {
  calculateMovementDuration,
  chooseFleeTarget,
  chooseMoodAction,
  chooseRoamingTarget,
  clampRoamingPoint,
  ROAMING_PET_SIZE,
  type RoamingAction,
  type RoamingPoint,
  type RoamingViewport
} from '../domain/roaming';
import {
  DEFAULT_PET_STATE,
  DEFAULT_SETTINGS,
  type CustomPetAsset,
  type PetMood,
  type PetState,
  type UserSettings
} from '../domain/models';
import { t, type MessageKey } from '../i18n/zh-CN';
import '../styles/theme.css';
import '../styles/roaming.css';

const PET_KEY = 'petStateV1';
const SETTINGS_KEY = 'settingsV1';
const ONBOARDING_KEY = 'onboardingV1';
const CUSTOM_PET_KEY = 'customPetAssetV1';
const REMINDER_KEY = 'staleReminderShownAtV1';
const REMINDER_COOLDOWN_MS = 30 * 60 * 1000;

const spriteState: Record<PetMood, SpriteState> = {
  sleeping: 'calm',
  calm: 'calm',
  curious: 'curious',
  busy: 'busy',
  overwhelmed: 'overwhelmed',
  celebrating: 'curious'
};

const moodLineKey: Record<PetMood, MessageKey> = {
  sleeping: 'roaming.sleeping',
  calm: 'roaming.calm',
  curious: 'roaming.curious',
  busy: 'roaming.busy',
  overwhelmed: 'roaming.overwhelmed',
  celebrating: 'roaming.celebrating'
};

interface OverlayState {
  pet: PetState;
  settings: UserSettings;
  onboarded: boolean;
  customPet?: CustomPetAsset;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPetMood(value: unknown): value is PetMood {
  return typeof value === 'string' && value in spriteState;
}

function parseOverlayState(values: Record<string, unknown>): OverlayState {
  const rawPet = values[PET_KEY];
  const rawSettings = values[SETTINGS_KEY];
  const rawOnboarding = values[ONBOARDING_KEY];
  const rawCustomPet = values[CUSTOM_PET_KEY];
  const pet = isRecord(rawPet) && rawPet.schemaVersion === 1
    ? {
        ...DEFAULT_PET_STATE,
        ...(typeof rawPet.name === 'string' && rawPet.name.length > 0 ? { name: rawPet.name.slice(0, 40) } : {}),
        ...(isPetMood(rawPet.mood) ? { mood: rawPet.mood } : {}),
        ...(typeof rawPet.staleTabCount === 'number' && Number.isInteger(rawPet.staleTabCount) && rawPet.staleTabCount >= 0
          ? { staleTabCount: rawPet.staleTabCount }
          : {})
      }
    : DEFAULT_PET_STATE;
  const settings = isRecord(rawSettings) && rawSettings.schemaVersion === 1
    ? {
        ...DEFAULT_SETTINGS,
        ...(typeof rawSettings.reducedMotion === 'boolean' ? { reducedMotion: rawSettings.reducedMotion } : {}),
        ...(typeof rawSettings.roamingEnabled === 'boolean' ? { roamingEnabled: rawSettings.roamingEnabled } : {}),
        ...(typeof rawSettings.staleRemindersEnabled === 'boolean'
          ? { staleRemindersEnabled: rawSettings.staleRemindersEnabled }
          : {}),
        ...(typeof rawSettings.roamingOpacity === 'number' &&
          Number.isInteger(rawSettings.roamingOpacity) &&
          rawSettings.roamingOpacity >= 30 && rawSettings.roamingOpacity <= 100
          ? { roamingOpacity: rawSettings.roamingOpacity }
          : {})
        ,...(typeof rawSettings.customPetEnabled === 'boolean' ? { customPetEnabled: rawSettings.customPetEnabled } : {})
      }
    : rawSettings === undefined
      ? DEFAULT_SETTINGS
      : { ...DEFAULT_SETTINGS, roamingEnabled: false };
  const onboarded = isRecord(rawOnboarding) &&
    rawOnboarding.schemaVersion === 1 &&
    typeof rawOnboarding.completedAt === 'number';
  const customPet = isRecord(rawCustomPet) && rawCustomPet.schemaVersion === 1 &&
    typeof rawCustomPet.name === 'string' && rawCustomPet.name.length > 0 &&
    (rawCustomPet.spriteVersion === 1 || rawCustomPet.spriteVersion === 2) &&
    typeof rawCustomPet.dataUrl === 'string' && /^data:image\/(png|webp);base64,/.test(rawCustomPet.dataUrl) &&
    typeof rawCustomPet.importedAt === 'number'
    ? rawCustomPet as unknown as CustomPetAsset
    : undefined;
  return { pet, settings, onboarded, ...(settings.customPetEnabled && customPet ? { customPet } : {}) };
}

async function readOverlayState(): Promise<OverlayState> {
  const values = await browser.storage.local.get([PET_KEY, SETTINGS_KEY, ONBOARDING_KEY, CUSTOM_PET_KEY]);
  return parseOverlayState(values);
}

function viewport(): RoamingViewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

function initialPosition(): RoamingPoint {
  return clampRoamingPoint({ x: window.innerWidth - 150, y: window.innerHeight - 160 }, viewport());
}

interface CaretPositionLike {
  offsetNode: Node;
  offset: number;
}

type TextHitTestDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPositionLike | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function pointTouchesRenderedText(x: number, y: number): boolean {
  const hitTestDocument = document as TextHitTestDocument;
  const caretPosition = hitTestDocument.caretPositionFromPoint?.(x, y);
  const fallbackRange = caretPosition ? null : hitTestDocument.caretRangeFromPoint?.(x, y);
  const node = caretPosition?.offsetNode ?? fallbackRange?.startContainer;
  const offset = caretPosition?.offset ?? fallbackRange?.startOffset ?? 0;
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  const textLength = (node as Text).length;
  if (textLength === 0) return false;
  const range = document.createRange();
  range.setStart(node, Math.max(0, Math.min(textLength - 1, offset - 1)));
  range.setEnd(node, Math.min(textLength, Math.max(1, offset + 1)));
  return [...range.getClientRects()].some((rect) =>
    rect.width > 0 && rect.height > 0 &&
    x >= rect.left - 3 && x <= rect.right + 3 &&
    y >= rect.top - 3 && y <= rect.bottom + 3
  );
}

function overlapsRenderedText(point: RoamingPoint): boolean {
  const size = ROAMING_PET_SIZE;
  const samples = [
    [0.3, 0.25], [0.7, 0.25], [0.5, 0.52], [0.3, 0.82], [0.7, 0.82]
  ];
  return samples.some(([xRatio, yRatio]) =>
    pointTouchesRenderedText(point.x + size * xRatio!, point.y + size * yRatio!)
  );
}

function pathOverlapsRenderedText(from: RoamingPoint, to: RoamingPoint): boolean {
  return [0.34, 0.67, 1].some((progress) => overlapsRenderedText({
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress
  }));
}

function RoamingTabbit({ initial }: { initial: OverlayState }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(position);
  const [movementDuration, setMovementDuration] = useState(1_800);
  const [facingLeft, setFacingLeft] = useState(false);
  const [action, setAction] = useState<RoamingAction>('wave');
  const [message, setMessage] = useState(() => t('roaming.arrived', { name: initial.pet.name }));
  const [announceMessage, setAnnounceMessage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const enabled = snapshot.onboarded && (snapshot.settings.roamingEnabled ?? true);
  const reducedMotion = snapshot.settings.reducedMotion;

  const showMessage = useCallback((next: string, duration = 3_200, announce = false) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(next);
    setAnnounceMessage(announce);
    messageTimer.current = setTimeout(() => {
      setMessage('');
      setAnnounceMessage(false);
    }, duration);
  }, []);

  const showAction = useCallback((next: RoamingAction, duration = 1_400) => {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    setAction(next);
    if (next !== 'selected') {
      actionTimer.current = setTimeout(() => setAction('idle'), duration);
    }
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const relevantKeys = new Set([PET_KEY, SETTINGS_KEY, ONBOARDING_KEY, CUSTOM_PET_KEY]);
    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'local' || !Object.keys(changes).some((key) => relevantKeys.has(key))) return;
      void readOverlayState().then(setSnapshot);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const onResize = () => setPosition((current) => clampRoamingPoint(current, viewport()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotion || menuOpen) return;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const move = () => {
      if (cancelled) return;
      let nextDelay = 900;
      if (document.visibilityState === 'visible') {
        const current = positionRef.current;
        const next = chooseRoamingTarget(
          viewport(),
          current,
          Math.random,
          (candidate) => pathOverlapsRenderedText(current, candidate)
        );
        const duration = calculateMovementDuration(current, next);
        setMovementDuration(duration);
        setFacingLeft(next.x < current.x);
        setPosition(next);
        const nextAction = chooseMoodAction(snapshot.pet.mood);
        showAction(nextAction, nextAction === 'nap' ? 2_400 : 1_300);
        if (Math.random() < 0.35) showMessage(t(moodLineKey[snapshot.pet.mood]), 2_800);
        nextDelay = duration + 100 + Math.random() * 350;
      }
      moveTimer = setTimeout(move, nextDelay);
    };
    moveTimer = setTimeout(move, 350);
    return () => {
      cancelled = true;
      if (moveTimer) clearTimeout(moveTimer);
    };
  }, [enabled, menuOpen, reducedMotion, showAction, showMessage, snapshot.pet.mood]);

  useEffect(() => {
    const staleCount = snapshot.pet.staleTabCount ?? 0;
    if (!enabled || !(snapshot.settings.staleRemindersEnabled ?? true) || staleCount < 1) return;
    let cancelled = false;
    const maybeRemind = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = await browser.storage.local.get(REMINDER_KEY);
      const lastShownAt = typeof result[REMINDER_KEY] === 'number' ? result[REMINDER_KEY] : 0;
      const now = Date.now();
      if (now - lastShownAt < REMINDER_COOLDOWN_MS || cancelled) return;
      await browser.storage.local.set({ [REMINDER_KEY]: now });
      if (cancelled) return;
      showAction('alert', 1_800);
      showMessage(t('roaming.staleReminder', { count: staleCount }), 7_000, true);
    };
    void maybeRemind();
    const onVisibilityChange = () => void maybeRemind();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, showAction, showMessage, snapshot.pet.staleTabCount, snapshot.settings.staleRemindersEnabled]);

  useEffect(() => () => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    if (actionTimer.current) clearTimeout(actionTimer.current);
  }, []);

  async function updatePreference(payload: {
    roamingEnabled?: boolean;
    staleRemindersEnabled?: boolean;
    roamingOpacity?: number;
  }) {
    const response = await browser.runtime.sendMessage({
      type: 'TABBIT_UPDATE_ROAMING_SETTINGS',
      payload
    }).catch(() => ({ ok: false }));
    if (!(response as { ok?: boolean } | undefined)?.ok) showMessage(t('roaming.updateError'), 5_000, true);
  }

  async function openOptions() {
    const response = await browser.runtime.sendMessage({ type: 'TABBIT_OPEN_OPTIONS' })
      .catch(() => ({ ok: false }));
    if (!(response as { ok?: boolean } | undefined)?.ok) {
      setMenuOpen(false);
      showAction('idle');
      showMessage(t('roaming.updateError'), 5_000, true);
    }
  }

  function flee(event: ReactMouseEvent | ReactKeyboardEvent) {
    if ('button' in event && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    const pointer = 'clientX' in event
      ? { x: event.clientX, y: event.clientY }
      : { x: positionRef.current.x + 56, y: positionRef.current.y + 56 };
    const next = chooseFleeTarget(viewport(), pointer);
    setMovementDuration(650);
    setFacingLeft(next.x < positionRef.current.x);
    setPosition(next);
    showAction('flee', 900);
    showMessage(t('roaming.flee'), 2_000);
  }

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') flee(event);
    if (event.key === 'Escape') {
      setMenuOpen(false);
      showAction('idle');
    }
  }

  if (!enabled) return null;

  const menuLeft = position.x > window.innerWidth / 2;
  const menuTop = position.y > window.innerHeight / 2;
  const classNames = [
    'tabbitRoamer',
    `action-${action}`,
    facingLeft ? 'facingLeft' : '',
    reducedMotion ? 'reducedMotion' : '',
    menuLeft ? 'menuLeft' : '',
    menuTop ? 'menuTop' : ''
  ].filter(Boolean).join(' ');
  const roamerStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    '--tabbit-move-duration': `${movementDuration}ms`,
    '--tabbit-opacity': String((snapshot.settings.roamingOpacity ?? 100) / 100)
  } as CSSProperties;

  return (
    <div className="tabbitRoamingLayer">
      <div className={classNames} style={roamerStyle}>
        {message && !menuOpen && (
          <div className="roamingSpeech" role={announceMessage ? 'status' : undefined}>
            {message}
          </div>
        )}
        <button
          className="tabbitPetButton"
          aria-label={t('roaming.petAria', { name: snapshot.pet.name })}
          onClick={flee}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen(true);
            showAction('selected');
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="rabbitVisual" aria-hidden="true">
            <TabbitSprite
              state={spriteState[snapshot.pet.mood]}
              label={t('roaming.petAria', { name: snapshot.pet.name })}
              reducedMotion={reducedMotion}
              customPet={snapshot.customPet}
            />
          </div>
          {action === 'nap' && <span className="roamingZzz" aria-hidden="true">Zzz</span>}
          {action === 'flee' && <span className="roamingDust" aria-hidden="true">•••</span>}
        </button>

        {menuOpen && (
          <div className="tabbitPetMenu" role="dialog" aria-label={t('roaming.selected', { name: snapshot.pet.name })}>
            <div className="tabbitPetMenuHeader">
              <strong>{t('roaming.selected', { name: snapshot.pet.name })}</strong>
              <button className="menuClose" aria-label={t('roaming.closeMenu')} onClick={() => { setMenuOpen(false); showAction('idle'); }}>×</button>
            </div>
            <p>{t('roaming.menuHint')}</p>
            <button onClick={() => void updatePreference({ staleRemindersEnabled: !(snapshot.settings.staleRemindersEnabled ?? true) })}>
              {(snapshot.settings.staleRemindersEnabled ?? true) ? t('roaming.remindersOn') : t('roaming.remindersOff')}
            </button>
            <button onClick={() => void openOptions()}>
              {t('roaming.openSettings')}
            </button>
            <button className="menuDanger" onClick={() => void updatePreference({ roamingEnabled: false })}>
              {t('roaming.hide')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  noScriptStartedPostMessage: true,
  async main(ctx) {
    const initial = await readOverlayState();
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'tabbit-roaming-pet',
      position: 'overlay',
      zIndex: 2_147_483_646,
      isolateEvents: ['click', 'contextmenu', 'keydown', 'keyup', 'keypress'],
      onMount(container) {
        const root = createRoot(container);
        root.render(<RoamingTabbit initial={initial} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      }
    });
    ui.mount();
  }
});
