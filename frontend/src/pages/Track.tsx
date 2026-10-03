import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../services/api';
import type { TrackedReport, Status } from '../types';
import { StatusPill } from '../components/StatusPill';

export function Track({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [report, setReport] = useState<TrackedReport | null>(null);
  const [error, setError] = useState<'not-found' | 'server' | 'empty' | null>(null);
  const [busy, setBusy] = useState(false);

  async function find(value: string) {
    const normalized = value.trim();
    if (!normalized) { setError('empty'); setReport(null); return; }
    setBusy(true); setError(null); setReport(null);
    try { setReport(await api.track(normalized)); }
    catch (cause) { setError(cause instanceof ApiError && cause.status === 404 ? 'not-found' : 'server'); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (initialCode) void find(initialCode); }, [initialCode]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void find(code);
  }

  return <section className="track-shell" aria-labelledby="track-title">
    <p className="eyebrow">Private case tracking</p>
    <h1 id="track-title">Track a report</h1>
    <p className="page-description">Use the case code you received when you submitted your report.</p>
    <form className="track-form" onSubmit={submit} noValidate>
      <label className="form-field" htmlFor="case-code"><span className="field-label">Case code</span>
        <input id="case-code" value={code} onChange={event => { setCode(event.target.value); if (error) setError(null); }} placeholder="WD-…" autoComplete="off" spellCheck={false} aria-describedby={error === 'empty' ? 'track-error' : undefined} />
      </label>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true" />Finding your report…</> : <>Find report <span aria-hidden="true">→</span></>}</button>
    </form>
    {error === 'empty' && <p id="track-error" className="inline-error" role="alert">Enter your case code to track a report.</p>}
    {error === 'not-found' && <div className="empty-state" role="status"><span className="empty-icon" aria-hidden="true">?</span><h2>Report not found</h2><p>Check your case code and try again.</p></div>}
    {error === 'server' && <div className="empty-state" role="alert"><span className="empty-icon" aria-hidden="true">!</span><h2>Unable to retrieve the report</h2><p>There was a problem reaching the service. Try again.</p><button className="button button-secondary" onClick={() => void find(code)}>Try again</button></div>}
    {report && <TrackingResult report={report} />}
    {!report && !error && !busy && <p className="quiet-empty">Enter your case code to track a report.</p>}
  </section>;
}

function TrackingResult({ report }: { report: TrackedReport }) {
  const closedOutcome = report.status === 'CLOSED'
    ? [...report.updates].reverse().find(update => update.status === 'RESOLVED' || update.status === 'DISMISSED')?.status
    : undefined;
  const outcome = report.status === 'DISMISSED' ? 'DISMISSED' : report.status === 'RESOLVED' ? 'RESOLVED' : report.status === 'CLOSED' ? closedOutcome ?? 'RESOLVED' : null;
  const milestones: { status: Status | null; title: string; date?: string }[] = [
    { status: 'SUBMITTED', title: 'Submitted', date: updateDate(report, 'SUBMITTED') },
    { status: 'UNDER_REVIEW', title: 'Under review', date: updateDate(report, 'UNDER_REVIEW') },
    { status: outcome, title: outcome === 'DISMISSED' ? 'Dismissed' : outcome === 'RESOLVED' ? 'Resolved' : 'Resolved / dismissed', date: outcome ? updateDate(report, outcome) : undefined },
  ];
  if (report.status === 'CLOSED') milestones.push({ status: 'CLOSED', title: 'Case closed', date: updateDate(report, 'CLOSED') });
  const latest = report.updates[report.updates.length - 1];

  return <section className="tracking-result" aria-label="Report tracking result">
    <div className="result-heading"><div><span className="field-label">Case</span><code>{report.case_code}</code></div><StatusPill status={report.status} /></div>
    <div className="current-status"><span className="field-label">Current status</span><h2>{report.status.replace('_', ' ')}</h2><span className="status-caption">Your report’s current place in the review process.</span></div>
    <div className="timeline-block"><h3>Progress</h3><ol className="progress-timeline">{milestones.map((item, index) => {
      const done = (item.status === 'SUBMITTED' && report.status !== 'SUBMITTED') || (item.status === 'UNDER_REVIEW' && ['RESOLVED','DISMISSED','CLOSED'].includes(report.status)) || ((item.status === 'RESOLVED' || item.status === 'DISMISSED') && report.status === 'CLOSED') || (item.status === report.status && item.status === 'CLOSED');
      const active = item.status === report.status;
      return <li key={`${item.title}-${index}`} className={done ? 'is-done' : active ? 'is-current' : ''}><span className="timeline-dot" aria-hidden="true">{done ? '✓' : ''}</span><div><strong>{item.title}</strong>{item.date && <time>{formatDate(item.date)}</time>}</div></li>;
    })}</ol></div>
    <div className="latest-update"><span className="field-label">Latest update</span><p>{latest?.message ?? 'Your report has been received.'}</p><span className="field-help">Last updated {formatDate(report.updated_at)}</span></div>
  </section>;
}

function updateDate(report: TrackedReport, status: Status) {
  return report.updates.find(update => update.status === status)?.created_at;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
