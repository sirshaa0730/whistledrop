type Page = 'submit' | 'track';

export function Home({ go }: { go: (page: Page) => void }) {
  return <>
    <section className="home-hero">
      <p className="eyebrow">A private way to speak up</p>
      <h1>Speak without<br /><span>being seen.</span></h1>
      <p className="hero-copy">Submit sensitive reports without creating an account or revealing your identity.</p>
      <div className="hero-actions">
        <button className="button button-primary" onClick={() => go('submit')}>Submit a report <span aria-hidden="true">↗</span></button>
        <button className="button button-secondary" onClick={() => go('track')}>Track a report</button>
      </div>
      <p className="privacy-note"><span className="quiet-mark" aria-hidden="true">●</span> No account. No profile. Just your report and a private case code.</p>
    </section>

    <section className="principles" aria-label="Privacy principles">
      <article><span className="principle-index">01</span><div><h2>No account required</h2><p>No registration or profile is needed to submit a report.</p></div></article>
      <article><span className="principle-index">02</span><div><h2>Privacy by design</h2><p>The service is designed to minimize the information it asks you for.</p></div></article>
      <article><span className="principle-index">03</span><div><h2>Private case tracking</h2><p>Keep your case code to check progress when you choose.</p></div></article>
    </section>

    <section className="how-it-works">
      <div className="section-intro"><p className="eyebrow">A straightforward process</p><h2>How it works</h2></div>
      <ol className="steps">
        <li><span>01</span><div><h3>Submit</h3><p>Share what happened, without creating an account.</p></div></li>
        <li><span>02</span><div><h3>Save</h3><p>Receive a private case code. Keep it somewhere safe.</p></div></li>
        <li><span>03</span><div><h3>Track</h3><p>Use your code to check the report’s progress.</p></div></li>
      </ol>
    </section>
  </>;
}
