export function Security() {
  return <article className="reading-page">
    <p className="eyebrow">How the service is protected</p><h1>Security</h1>
    <p className="page-description">A short description of the protections built into this project and the controls an operator must provide.</p>
    <section><h2>Moderator access</h2><p>Moderator API routes require a shared Bearer token configured through an environment variable. The browser dashboard does not replace this server-side check. Use HTTPS and keep the token out of source control.</p></section>
    <section><h2>Report codes and validation</h2><p>Case codes are generated using cryptographically secure random bytes and are separate from internal database IDs. The API validates report fields, categories, status values and allowed status transitions.</p></section>
    <section><h2>Evidence handling</h2><p>Uploads are limited to PDF, PNG, JPG/JPEG and TXT, checked against the file extension and declared MIME type, and capped at 5 MB. The server stores files under generated names and resolves storage paths under the configured evidence directory. Only authenticated moderators can download evidence.</p><p className="reading-note">The current project does not inspect file signatures or scan uploads for malware. File validation is not a guarantee that a file is safe to open.</p></section>
    <section><h2>Operations matter</h2><p>Database credentials and moderator secrets must be supplied through environment configuration. The application does not include a production secrets manager, database encryption policy, backups, or retention automation. Operators should use TLS, restrict database and evidence-volume access, and set an appropriate retention policy.</p></section>
  </article>;
}
