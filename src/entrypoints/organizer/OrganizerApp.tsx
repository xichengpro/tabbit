import { useEffect, useMemo, useState } from 'react';
import type { OrganizerAnalysis, OrganizerCandidate } from '../../domain/organizer';
import type { OrganizerRecoverySnapshot } from '../../domain/models';
import { t } from '../../i18n/zh-CN';
import {
  analyzeOpenTabs,
  closeOrganizerCandidates,
  hasOrganizerPermission,
  requestOrganizerPermission,
  restoreLastOrganizerBatch
} from '../../services/organizer';
import { getOrganizerRecoverySnapshot } from '../../services/storage';
import { browser } from 'wxt/browser';

function remainingHours(snapshot: OrganizerRecoverySnapshot): number {
  return Math.max(1, Math.ceil((snapshot.expiresAt - Date.now()) / (60 * 60 * 1_000)));
}

function candidateTitle(candidate: OrganizerCandidate): string {
  return candidate.title.trim() || candidate.url;
}

export default function OrganizerApp() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<OrganizerAnalysis | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [recovery, setRecovery] = useState<OrganizerRecoverySnapshot | undefined>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedCandidates = useMemo(
    () => analysis?.candidates.filter((candidate) => selected.has(candidate.id)) ?? [],
    [analysis, selected]
  );

  useEffect(() => {
    void Promise.all([hasOrganizerPermission(), getOrganizerRecoverySnapshot()])
      .then(([permission, snapshot]) => {
        setHasPermission(permission);
        setRecovery(snapshot);
      })
      .catch(() => setHasPermission(false));
  }, []);

  async function refreshAnalysis() {
    setBusy(true);
    setNotice(null);
    try {
      const next = await analyzeOpenTabs();
      setAnalysis(next);
      setSelected(new Set());
      setConfirming(false);
    } catch {
      setNotice(t('organizer.operationError'));
    } finally {
      setBusy(false);
    }
  }

  async function grantPermission() {
    setBusy(true);
    setNotice(null);
    try {
      const granted = await requestOrganizerPermission();
      setHasPermission(granted);
      if (granted) await refreshAnalysis();
      else setNotice(t('organizer.permissionDenied'));
    } catch {
      setNotice(t('organizer.permissionError'));
    } finally {
      setBusy(false);
    }
  }

  function toggleCandidate(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function closeSelected() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await closeOrganizerCandidates(selectedCandidates);
      setConfirming(false);
      if (result.closed === 0) setNotice(t('organizer.closeError'));
      else if (result.failed > 0) setNotice(t('organizer.closePartial', { closed: result.closed, failed: result.failed }));
      else setNotice(t('organizer.closeResult', { closed: result.closed }));
      setRecovery(result.snapshot ?? await getOrganizerRecoverySnapshot());
      await refreshAnalysis();
    } catch {
      setNotice(t('organizer.operationError'));
    } finally {
      setBusy(false);
    }
  }

  async function restoreLast() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await restoreLastOrganizerBatch();
      if (result.restored === 0 && result.failed === 0) setNotice(t('organizer.restoreEmpty'));
      else if (result.failed > 0) setNotice(t('organizer.restorePartial', { restored: result.restored, failed: result.failed }));
      else setNotice(t('organizer.restoreResult', { restored: result.restored }));
      setRecovery(await getOrganizerRecoverySnapshot());
      if (hasPermission) await refreshAnalysis();
    } catch {
      setNotice(t('organizer.operationError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="organizer shell">
      <header className="organizerHeader">
        <div>
          <span className="eyebrow">TABBIT · SAFE CLEANUP</span>
          <h1>{t('organizer.title')}</h1>
        </div>
        <button className="secondary compact" onClick={() => void browser.tabs.getCurrent().then((tab) => tab?.id === undefined ? undefined : browser.tabs.remove(tab.id))}>{t('organizer.back')}</button>
      </header>

      {recovery && (
        <section className="recoveryCard" aria-live="polite">
          <span>{t('organizer.recoveryReady', { count: recovery.tabs.length, hours: remainingHours(recovery) })}</span>
          <button className="secondary compact" disabled={busy} onClick={() => void restoreLast()}>{t('organizer.restore')}</button>
        </section>
      )}

      {hasPermission === null && <p className="hint">{t('app.loading')}</p>}

      {hasPermission === false && (
        <section className="organizerIntro card">
          <h2>{t('organizer.permissionTitle')}</h2>
          <p>{t('organizer.permissionBody')}</p>
          <button className="primary" disabled={busy} onClick={() => void grantPermission()}>{t('organizer.permissionButton')}</button>
        </section>
      )}

      {hasPermission && (
        <>
          {!analysis ? (
            <section className="organizerIntro card">
              <p>{t('organizer.privacyNote')}</p>
              <button className="primary" disabled={busy} onClick={() => void refreshAnalysis()}>{t('organizer.refresh')}</button>
            </section>
          ) : (
            <>
              <section className="organizerSummary card">
                <p>{t('organizer.scanned', { count: analysis.scannedCount, protected: analysis.protectedCount })}</p>
                <p className="hint">{t('organizer.privacyNote')}</p>
                <button className="secondary compact" disabled={busy} onClick={() => void refreshAnalysis()}>{t('organizer.refresh')}</button>
              </section>

              {analysis.domains.length > 0 && (
                <section className="card">
                  <h2>{t('organizer.domainSummary')}</h2>
                  <div className="domainList">
                    {analysis.domains.map((domain) => <span key={domain.domain}>{domain.domain} · {t('organizer.domainCount', { count: domain.count })}</span>)}
                  </div>
                </section>
              )}

              {analysis.candidates.length === 0 ? (
                <section className="organizerEmpty card">
                  <h2>{t('organizer.emptyTitle')}</h2>
                  <p>{t('organizer.emptyBody')}</p>
                </section>
              ) : (
                <section className="card organizerCandidates">
                  <div className="organizerSectionHead">
                    <h2>{t('organizer.candidates')}</h2>
                    <span>{t('organizer.selected', { count: selected.size })}</span>
                  </div>
                  <div className="selectionActions">
                    <button className="textButton" onClick={() => setSelected(new Set(analysis.candidates.map((candidate) => candidate.id)))}>{t('organizer.selectAll')}</button>
                    <button className="textButton" onClick={() => setSelected(new Set())}>{t('organizer.clearSelection')}</button>
                  </div>
                  <div className="candidateList">
                    {analysis.candidates.map((candidate) => (
                      <label className="candidateRow" key={candidate.id}>
                        <input type="checkbox" checked={selected.has(candidate.id)} onChange={() => toggleCandidate(candidate.id)} />
                        <span className="candidateContent">
                          <strong>{candidateTitle(candidate)}</strong>
                          <small>{candidate.url}</small>
                          <span className="reasonChips">
                            {candidate.reasons.map((reason) => <em key={reason}>{t(reason === 'STALE' ? 'organizer.reason.stale' : 'organizer.reason.duplicate')}</em>)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button className="primary" disabled={busy || selected.size === 0} onClick={() => setConfirming(true)}>
                    {t('organizer.closeSelected', { count: selected.size })}
                  </button>
                </section>
              )}
            </>
          )}
        </>
      )}

      {confirming && (
        <div className="confirmationBackdrop" role="presentation">
          <section className="confirmationCard" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{t('organizer.confirmTitle', { count: selectedCandidates.length })}</h2>
            <p>{t('organizer.confirmBody')}</p>
            <div className="buttonRow">
              <button className="secondary" disabled={busy} onClick={() => setConfirming(false)}>{t('organizer.cancel')}</button>
              <button className="primary dangerButton" disabled={busy} onClick={() => void closeSelected()}>{t('organizer.confirmClose')}</button>
            </div>
          </section>
        </div>
      )}

      {notice && <p className="organizerNotice" role="status">{notice}</p>}
    </main>
  );
}
