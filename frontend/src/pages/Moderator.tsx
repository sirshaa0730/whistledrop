import { useState, type FormEvent } from 'react';
import { api, ApiError, downloadEvidence } from '../services/api';
import type { ModeratorReport, Status } from '../types';
import { StatusPill } from '../components/StatusPill';

const statusOptions: Status[] = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'CLOSED'];
const categoryOptions = ['SECURITY', 'HARASSMENT', 'MISCONDUCT', 'FRAUD', 'OTHER'];

export function Moderator() {
  const [token, setToken] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [reports, setReports] = useState<ModeratorReport[]>([]);
  const [selected, setSelected] = useState<ModeratorReport | null>(null);
  const [filters, setFilters] = useState({ search: '', status: '', category: '' });
  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  async function load(nextFilters = filters, selectId?: number) {
    setBusy(true); setError('');
    try {
      const rows = await api.list(token, nextFilters);
      setReports(rows); setSignedIn(true);
      if (selectId) setSelected(await api.detail(token, selectId));
      else setSelected(null);
    } catch (cause) {
      if (cause instanceof ApiError && [401, 503].includes(cause.status)) setSignedIn(false);
      setError(cause instanceof ApiError && cause.status === 401 ? 'That moderator token was not accepted. Check it and try again.' : cause instanceof ApiError && cause.status === 503 ? 'Moderator access is not configured on this server.' : messageFor(cause));
    } finally { setBusy(false); }
  }

  async function openReport(id: number) {
    setBusy(true); setError(''); setNote(''); setNextStatus('');
    try { setSelected(await api.detail(token, id)); }
    catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }

  async function saveUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !note.trim() || busy || selected.status === 'CLOSED') return;
    setBusy(true); setError('');
    try {
      if (nextStatus) await api.change(token, selected.id, nextStatus as Status, note.trim());
      else await api.update(token, selected.id, note.trim());
      setNote(''); setNextStatus('');
      await load(filters, selected.id);
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }

  async function permanentlyClose() {
    if (!selected) return;
    setBusy(true); setError(''); setConfirmClose(false);
    try { await api.close(token, selected.id); await load(filters, selected.id); }
    catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }

  function signOut() {
    setToken(''); setSignedIn(false); setReports([]); setSelected(null); setError(''); setNote(''); setNextStatus('');
  }

  if (!signedIn) return <section className="moderator-signin" aria-labelledby="moderator-title">
    <span className="moderator-kicker">WhistleDrop <span aria-hidden="true">/</span> Moderator</span>
    <p className="eyebrow">Restricted area</p><h1 id="moderator-title">Moderator access</h1>
    <p className="page-description">Sign in with your configured moderator token to review reports.</p>
    <form className="signin-form" onSubmit={event => { event.preventDefault(); void load(); }} noValidate>
      <label className="form-field" htmlFor="moderator-token"><span className="field-label">Moderator token</span>
        <input id="moderator-token" type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="current-password" required aria-describedby={error ? 'moderator-error' : undefined} />
      </label>
      {error && <p id="moderator-error" className="form-alert" role="alert">{error}</p>}
      <button className="button button-primary" disabled={busy || !token.trim()}>{busy ? <><span className="spinner" aria-hidden="true" />Checking access…</> : <>Sign in <span aria-hidden="true">→</span></>}</button>
    </form>
    <p className="field-help signin-privacy">Your token is held only in this page while it is open.</p>
  </section>;

  const counts = {
    total: reports.length,
    review: reports.filter(report => report.status === 'UNDER_REVIEW').length,
    resolved: reports.filter(report => report.status === 'RESOLVED').length,
    closed: reports.filter(report => report.status === 'CLOSED').length,
  };
  const allowedNext = selected?.status === 'SUBMITTED' ? ['UNDER_REVIEW'] : selected?.status === 'UNDER_REVIEW' ? ['RESOLVED', 'DISMISSED'] : [];

  return <section className="moderator-dashboard" aria-labelledby="reports-title">
    <div className="dashboard-topline"><span className="moderator-kicker">WhistleDrop <span aria-hidden="true">/</span> Moderator</span><button className="text-button signout-button" onClick={signOut}>Sign out</button></div>
    <div className="dashboard-title"><div><p className="eyebrow">Review workspace</p><h1 id="reports-title">Reports</h1></div><span className="result-limit">Showing up to 200 reports</span></div>

    <div className="summary-strip" aria-label="Report summary">
      <div><span>Total shown</span><strong>{counts.total}</strong></div><div><span>Under review</span><strong>{counts.review}</strong></div><div><span>Resolved</span><strong>{counts.resolved}</strong></div><div><span>Closed</span><strong>{counts.closed}</strong></div>
    </div>

    <form className="dashboard-filters" onSubmit={event => { event.preventDefault(); void load(); }}>
      <label className="search-field"><span className="sr-only">Search case code or report text</span><span className="search-symbol" aria-hidden="true">⌕</span><input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Search case code or report text" /></label>
      <label><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statusOptions.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
      <label><span className="sr-only">Filter by category</span><select aria-label="Filter by category" value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{categoryOptions.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
      <button className="button button-primary" disabled={busy}>{busy ? 'Loading…' : 'Apply filters'}</button>
    </form>

    {error && <p className="form-alert dashboard-alert" role="alert">{error}</p>}
    {busy && <p className="loading-line" role="status"><span className="spinner" aria-hidden="true" />Loading reports…</p>}
    <div className="dashboard-grid">
      <section className="report-list-panel" aria-label="Report list">
        {reports.length ? <table className="report-table"><thead><tr><th>Case</th><th>Category</th><th>Status</th><th>Submitted</th><th>Updated</th></tr></thead><tbody>{reports.map(report => <tr key={report.id} className={selected?.id === report.id ? 'selected-row' : ''}>
          <td data-label="Case"><button className="case-link" onClick={() => void openReport(report.id)} aria-current={selected?.id === report.id ? 'true' : undefined}>{report.case_code}</button></td>
          <td data-label="Category">{categoryLabel(report.category)}</td><td data-label="Status"><StatusPill status={report.status} /></td><td data-label="Submitted">{formatDate(report.created_at, false)}</td><td data-label="Updated">{formatDate(report.updated_at, false)}</td>
        </tr>)}</tbody></table> : !busy && <div className="list-empty"><span aria-hidden="true">⌁</span><p>No reports match these filters.</p></div>}
      </section>

      {selected && <ReportDetail report={selected} allowedNext={allowedNext} nextStatus={nextStatus} setNextStatus={setNextStatus} note={note} setNote={setNote} busy={busy} onSave={saveUpdate} onClose={() => setConfirmClose(true)} onDownload={evidenceId => downloadEvidence(token, selected.id, evidenceId).catch(cause => setError(messageFor(cause)))} />}
    </div>

    {confirmClose && <div className="dialog-backdrop" onKeyDown={event => { if (event.key === 'Escape') setConfirmClose(false); }} onMouseDown={event => { if (event.target === event.currentTarget) setConfirmClose(false); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="close-title" aria-describedby="close-description">
      <span className="dialog-mark" aria-hidden="true">!</span><h2 id="close-title">Permanently close this case?</h2><p id="close-description">After closure, no further status changes, updates, or evidence can be added.</p>
      <div className="dialog-actions"><button className="button button-secondary" autoFocus onClick={() => setConfirmClose(false)}>Cancel</button><button className="button button-danger" disabled={busy} onClick={() => void permanentlyClose()}>{busy ? 'Closing…' : 'Permanently close'}</button></div>
    </section></div>}
  </section>;
}

function ReportDetail({ report, allowedNext, nextStatus, setNextStatus, note, setNote, busy, onSave, onClose, onDownload }: {
  report: ModeratorReport; allowedNext: string[]; nextStatus: string; setNextStatus: (status: string) => void; note: string; setNote: (value: string) => void; busy: boolean; onSave: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; onDownload: (id: number) => Promise<void>;
}) {
  return <aside className="detail-panel" aria-label={`Details for ${report.case_code}`}>
    <div className="detail-heading"><div><span className="field-label">Case</span><code>{report.case_code}</code></div><StatusPill status={report.status} /></div>
    <dl className="detail-facts"><div><dt>Category</dt><dd>{categoryLabel(report.category)}</dd></div><div><dt>Submitted</dt><dd>{formatDate(report.created_at, true)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(report.updated_at, true)}</dd></div></dl>
    <section className="detail-section"><h2>Description</h2><p className="detail-description">{report.description}</p>{report.reference_url && <p className="reference-line"><span className="field-label">Reference</span><a href={report.reference_url} target="_blank" rel="noreferrer">Open submitted reference <span aria-hidden="true">↗</span></a></p>}</section>
    {report.evidence.length > 0 && <section className="detail-section"><h2>Evidence <span className="count-label">{report.evidence.length}</span></h2><ul className="evidence-list">{report.evidence.map(file => <li key={file.id}><span className="file-glyph" aria-hidden="true">▤</span><span className="file-info"><strong>{file.original_filename}</strong><small>{formatSize(file.file_size)}</small></span><button className="text-button" onClick={() => void onDownload(file.id).catch(() => undefined)} aria-label={`Download ${file.original_filename}`}>Download</button></li>)}</ul></section>}
    <section className="detail-section"><h2>Update case</h2>
      {report.status !== 'CLOSED' ? <form className="update-form" onSubmit={onSave}>
        {allowedNext.length > 0 && <label className="form-field" htmlFor="next-status"><span className="field-label">Status</span><select id="next-status" value={nextStatus} onChange={event => setNextStatus(event.target.value)}><option value="">Keep current status</option>{allowedNext.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>}
        <label className="form-field" htmlFor="moderator-update"><span className="field-label">Status update</span><textarea id="moderator-update" value={note} onChange={event => setNote(event.target.value)} rows={4} maxLength={2000} required placeholder="Write a concise update for the reporter…" /></label>
        <button className="button button-primary" disabled={busy || !note.trim()}>{busy ? 'Saving…' : nextStatus ? 'Save status update' : 'Add update'}</button>
      </form> : <p className="closed-note">This case is permanently closed. No further changes can be made.</p>}
    </section>
    {['RESOLVED','DISMISSED'].includes(report.status) && <button className="close-case-button" onClick={onClose}>Permanently close case <span aria-hidden="true">→</span></button>}
  </aside>;
}

function categoryLabel(category: string) { return category.charAt(0) + category.slice(1).toLowerCase(); }
function formatDate(value: string, includeTime: boolean) { return new Intl.DateTimeFormat(undefined, includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { day: '2-digit', month: 'short' }).format(new Date(value)); }
function formatSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }
function messageFor(cause: unknown) { return cause instanceof Error ? cause.message : 'The service could not complete your request. Try again.'; }
