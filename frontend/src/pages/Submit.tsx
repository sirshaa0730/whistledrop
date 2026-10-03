import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { api } from '../services/api';

const maxBytes = 5 * 1024 * 1024;
const fileTypes: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };

type ErrorState = { field?: string; message: string } | null;

export function Submit({ onTrack }: { onTrack: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState('SECURITY');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caseCode, setCaseCode] = useState('');
  const [error, setError] = useState<ErrorState>(null);
  const [uploadError, setUploadError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    const extension = candidate.name.split('.').pop()?.toLowerCase() ?? '';
    const expectedType = fileTypes[extension];
    if (!expectedType || (candidate.type && candidate.type !== expectedType)) {
      setError({ field: 'file', message: 'Choose a PDF, PNG, JPG, or TXT file.' });
      return;
    }
    if (candidate.size > maxBytes) {
      setError({ field: 'file', message: 'The file must be 5 MB or smaller.' });
      return;
    }
    setError(null);
    setFile(candidate);
  }

  function fileChanged(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = '';
  }

  function dropped(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function validReference(value: string) {
    if (!value.trim()) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch { return false; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (description.trim().length < 10) {
      setError({ field: 'description', message: 'Please describe what happened in at least 10 characters.' });
      document.getElementById('report-description')?.focus();
      return;
    }
    if (!validReference(reference)) {
      setError({ field: 'reference', message: 'Enter a valid web address beginning with http:// or https://.' });
      document.getElementById('report-reference')?.focus();
      return;
    }
    if (file && (file.size > maxBytes || !fileTypes[file.name.split('.').pop()?.toLowerCase() ?? ''])) {
      setError({ field: 'file', message: file.size > maxBytes ? 'The file must be 5 MB or smaller.' : 'Choose a PDF, PNG, JPG, or TXT file.' });
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const created = await api.submit({ category, description: description.trim(), reference_url: reference.trim() || undefined });
      setCaseCode(created.case_code);
      if (file) {
        try { await api.upload(created.case_code, file); }
        catch (cause) { setUploadError(messageFor(cause)); }
      }
    } catch (submitError) {
      setError({ message: messageFor(submitError) });
    } finally { setBusy(false); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(caseCode); setCopied(true); setCopyError(''); }
    catch { setCopyError('Copy is unavailable here. Select and copy the case code above.'); }
  }

  function reset() {
    setCategory('SECURITY'); setDescription(''); setReference(''); setFile(null); setCaseCode(''); setError(null); setUploadError(''); setCopyError(''); setCopied(false);
  }

  if (caseCode) return <section className="form-shell success-shell" aria-labelledby="success-title">
    <div className="success-icon" aria-hidden="true">✓</div>
    <p className="eyebrow">Submission complete</p>
    <h1 id="success-title">Report submitted</h1>
    <p className="page-description">Your report has been received.</p>
    <div className="case-code-card"><span className="field-label">Your case code</span><code>{caseCode}</code><button className="button button-secondary" onClick={() => void copyCode()}>{copied ? 'Copied' : 'Copy case code'}</button>{copyError && <span className="field-help" role="status">{copyError}</span>}</div>
    <p className="save-reminder">Save this code somewhere safe. You will need it to track your report.</p>
    <p className="warning-note">WhistleDrop cannot recover your case code if you lose it.</p>
    {uploadError && <p className="inline-error" role="alert">Your report was received, but the evidence upload failed: {uploadError}</p>}
    <div className="form-actions"><button className="button button-primary" onClick={() => onTrack(caseCode)}>Track my report <span aria-hidden="true">→</span></button><button className="text-button" onClick={reset}>Submit another report</button></div>
  </section>;

  const errorFor = (field: string) => error?.field === field ? error.message : undefined;

  return <section className="form-shell" aria-labelledby="submit-title">
    <p className="eyebrow">Anonymous submission</p>
    <h1 id="submit-title">Submit a report</h1>
    <p className="page-description">Tell us what happened. No account or personal information is required.</p>
    <form className="report-form" onSubmit={submit} noValidate>
      <label className="form-field" htmlFor="report-category"><span className="field-label">Category</span>
        <select id="report-category" value={category} onChange={event => setCategory(event.target.value)} disabled={busy}>{[['SECURITY','Security'],['HARASSMENT','Harassment'],['CORRUPTION','Corruption'],['TECHNICAL','Technical'],['MISCONDUCT','Misconduct'],['FRAUD','Fraud'],['OTHER','Other']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>

      <label className="form-field" htmlFor="report-description"><span className="field-label">What happened?</span><span className="field-help">Share the details that will help someone understand the concern.</span>
        <textarea id="report-description" value={description} onChange={event => { setDescription(event.target.value); if (errorFor('description')) setError(null); }} rows={7} maxLength={10000} aria-invalid={!!errorFor('description')} aria-describedby={errorFor('description') ? 'description-error' : undefined} disabled={busy} />
        <span className="field-meta"><span id="description-error" className={errorFor('description') ? 'inline-error' : 'sr-only'} role={errorFor('description') ? 'alert' : undefined}>{errorFor('description')}</span><span>{description.length}/10,000</span></span>
      </label>

      <label className="form-field" htmlFor="report-reference"><span className="field-label">Reference URL <span className="optional">Optional</span></span><input id="report-reference" value={reference} onChange={event => { setReference(event.target.value); if (errorFor('reference')) setError(null); }} placeholder="https://example.com/page" inputMode="url" aria-invalid={!!errorFor('reference')} aria-describedby={errorFor('reference') ? 'reference-error' : undefined} disabled={busy} />
        {errorFor('reference') && <span id="reference-error" className="inline-error" role="alert">{errorFor('reference')}</span>}
      </label>

      <div className="form-field"><span className="field-label">Supporting evidence <span className="optional">Optional</span></span>
        <label className={`upload-area${dragging ? ' is-dragging' : ''}`} htmlFor="report-file" onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropped}>
          <input ref={inputRef} id="report-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={fileChanged} disabled={busy} aria-describedby={errorFor('file') ? 'file-error' : 'file-help'} />
          <span className="upload-glyph" aria-hidden="true">↑</span><span className="upload-title">Drop a file here or <span>browse</span></span><span id="file-help" className="field-help">PDF · PNG · JPG · TXT <span aria-hidden="true">·</span> Maximum 5 MB</span>
        </label>
        {file && <div className="selected-file"><span className="file-glyph" aria-hidden="true">▤</span><span className="file-info"><strong>{file.name}</strong><small>{formatSize(file.size)}</small></span><button className="remove-file" type="button" onClick={() => { setFile(null); setError(null); }} aria-label={`Remove ${file.name}`} disabled={busy}>Remove</button></div>}
        {errorFor('file') && <span id="file-error" className="inline-error" role="alert">{errorFor('file')}</span>}
      </div>

      {error && !error.field && <p className="form-alert" role="alert">{error.message}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true" />Submitting securely…</> : <>Submit anonymously <span aria-hidden="true">→</span></>}</button>
      <div className="locked-note"><span aria-hidden="true">⌑</span><p><strong>Designed to minimize personal data</strong><br />WhistleDrop does not ask for your name, email, phone number, or account.</p></div>
    </form>
  </section>;
}

function messageFor(error: unknown) {
  if (error instanceof TypeError) return 'Unable to reach the service. Check your connection and try again.';
  return error instanceof Error ? error.message : 'The service could not complete your request. Try again.';
}

function formatSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
