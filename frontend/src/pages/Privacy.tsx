export function Privacy() {
  return <article className="reading-page">
    <p className="eyebrow">Privacy, plainly explained</p><h1>Privacy</h1>
    <p className="page-description">WhistleDrop is designed to ask for as little personal information as possible. Here is what that means in practice.</p>
    <section><h2>No account required</h2><p>You can submit and track a report without registering or creating a profile. The report form does not request your name, email address, or phone number.</p></section>
    <section><h2>Case-code tracking</h2><p>Each report receives a randomly generated case code. You need that code to view status and updates. Anyone who has the code can view the same limited tracking information, so keep it private. WhistleDrop cannot recover a lost code.</p></section>
    <section><h2>What is stored</h2><p>The service stores the category and report description, optional reference URL, case status and timestamps, moderator updates, and any evidence you choose to upload. It does not store a reporter profile or reporter contact details.</p></section>
    <section><h2>Who can see a report</h2><p>Authenticated moderators can read the report description, reference, evidence and status history so they can review it. Public case tracking shows the category, status, dates and updates, but not the report description or evidence. Moderator identities are not displayed in the public timeline.</p></section>
    <section><h2>Privacy has limits</h2><p>WhistleDrop does not claim that using it is untraceable. Network providers and hosting infrastructure may process connection data. Text, links, or files you submit could also identify you. Avoid including identifying details unless they are necessary to explain the concern.</p></section>
  </article>;
}
