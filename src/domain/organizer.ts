export interface OrganizerTabInput {
  id: number;
  windowId: number;
  index: number;
  url: string;
  title: string;
  lastAccessed?: number;
  active: boolean;
  pinned: boolean;
  audible: boolean;
}

export type OrganizerReasonCode = 'STALE' | 'DUPLICATE';

export interface OrganizerCandidate extends OrganizerTabInput {
  reasons: OrganizerReasonCode[];
}

export interface OrganizerDomainGroup {
  domain: string;
  count: number;
}

export interface OrganizerAnalysis {
  candidates: OrganizerCandidate[];
  domains: OrganizerDomainGroup[];
  protectedCount: number;
  scannedCount: number;
}

const RECENT_ACTIVITY_MS = 10 * 60 * 1_000;

export function normalizeComparableUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function domainForUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isProtected(tab: OrganizerTabInput, now: number): boolean {
  return tab.active || tab.pinned || tab.audible ||
    tab.lastAccessed === undefined || now - tab.lastAccessed < RECENT_ACTIVITY_MS;
}

function keeperOrder(left: OrganizerTabInput, right: OrganizerTabInput): number {
  const priority = (tab: OrganizerTabInput) => Number(tab.active) * 8 + Number(tab.pinned) * 4 + Number(tab.audible) * 2;
  const priorityDifference = priority(right) - priority(left);
  if (priorityDifference !== 0) return priorityDifference;
  return (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0);
}

export function analyzeTabsForOrganization(
  tabs: OrganizerTabInput[],
  staleAfterHours: number,
  now = Date.now()
): OrganizerAnalysis {
  const eligible = tabs.filter((tab) => normalizeComparableUrl(tab.url) !== null);
  const protectedIds = new Set(eligible.filter((tab) => isProtected(tab, now)).map((tab) => tab.id));
  const candidateReasons = new Map<number, Set<OrganizerReasonCode>>();
  const addReason = (tab: OrganizerTabInput, reason: OrganizerReasonCode) => {
    if (protectedIds.has(tab.id)) return;
    const reasons = candidateReasons.get(tab.id) ?? new Set<OrganizerReasonCode>();
    reasons.add(reason);
    candidateReasons.set(tab.id, reasons);
  };

  const staleThreshold = staleAfterHours * 60 * 60 * 1_000;
  for (const tab of eligible) {
    if (tab.lastAccessed !== undefined && now - tab.lastAccessed > staleThreshold) addReason(tab, 'STALE');
  }

  const byUrl = new Map<string, OrganizerTabInput[]>();
  for (const tab of eligible) {
    const normalized = normalizeComparableUrl(tab.url)!;
    const group = byUrl.get(normalized) ?? [];
    group.push(tab);
    byUrl.set(normalized, group);
  }
  for (const group of byUrl.values()) {
    if (group.length < 2) continue;
    const [, ...duplicates] = [...group].sort(keeperOrder);
    duplicates.forEach((tab) => addReason(tab, 'DUPLICATE'));
  }

  const byDomain = new Map<string, number>();
  eligible.forEach((tab) => {
    const domain = domainForUrl(tab.url);
    if (domain) byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
  });
  const byId = new Map(eligible.map((tab) => [tab.id, tab]));
  const candidates = [...candidateReasons.entries()]
    .map(([id, reasons]) => ({ ...byId.get(id)!, reasons: [...reasons] }))
    .sort((left, right) => right.reasons.length - left.reasons.length || (left.lastAccessed ?? 0) - (right.lastAccessed ?? 0));
  const domains = [...byDomain.entries()]
    .filter(([, count]) => count > 1)
    .map(([domain, count]) => ({ domain, count }))
    .sort((left, right) => right.count - left.count || left.domain.localeCompare(right.domain))
    .slice(0, 6);

  return { candidates, domains, protectedCount: protectedIds.size, scannedCount: tabs.length };
}
