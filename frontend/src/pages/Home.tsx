type Page = 'submit' | 'track';

export function Home({ go }: { go: (page: Page) => void }) {
  return <>
    <section className="home-hero">
      <div className="hero-copy-block">
        <p className="eyebrow">WhistleDrop / Private reporting</p>
        <h1>Speak without<br /><span>being seen.</span></h1>
        <p className="hero-copy">A private way to report something important. Share what happened without creating an account or adding your name to the story.</p>
        <div className="hero-actions">
          <button className="button button-primary" onClick={() => go('submit')}>Submit a report <span aria-hidden="true">↗</span></button>
          <button className="button button-secondary" onClick={() => go('track')}>Track a report</button>
        </div>
        <p className="privacy-note"><span className="quiet-mark" aria-hidden="true">●</span> No account. No profile. Keep your case code private.</p>
      </div>

      <figure className="signal-figure" aria-labelledby="signal-caption-title">
        <svg className="signal-rings" viewBox="0 0 470 340" aria-hidden="true">
          <circle cx="235" cy="156" r="72" />
          <circle cx="235" cy="156" r="112" />
          <circle className="signal-orbit" cx="235" cy="156" r="151" />
          <path d="M235 5v30M235 277v30M84 156h30M356 156h30" />
        </svg>
        <div className="signal-core" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M24 5c-6.8 9-14.5 16.8-14.5 25.2a14.5 14.5 0 0 0 29 0C38.5 21.8 30.8 14 24 5Z"/><path d="M17.4 30.5c.8 3.2 2.9 5.2 6.1 5.8M27.2 18.8l5 3.2"/></svg>
        </div>
        <figcaption className="signal-caption">
          <p className="eyebrow" id="signal-caption-title">Private by design</p>
          <p>Your words travel forward. Your identity stays out of the form.</p>
        </figcaption>
      </figure>
    </section>

    <section className="principles" aria-label="Privacy principles">
      <article><span className="principle-index">01</span><div><h2>No account required</h2><p>Start with the concern. No registration or profile comes first.</p></div></article>
      <article><span className="principle-index">02</span><div><h2>Only what is needed</h2><p>Share the details that help explain what happened.</p></div></article>
      <article><span className="principle-index">03</span><div><h2>A private way back</h2><p>Use your case code to check progress when you choose.</p></div></article>
    </section>

    <section className="how-it-works">
      <div className="section-intro"><p className="eyebrow">A straightforward process</p><h2>From first word to follow-up.</h2></div>
      <ol className="steps">
        <li><span>01</span><div><h3>Share</h3><p>Describe your concern without creating an account.</p></div></li>
        <li><span>02</span><div><h3>Keep</h3><p>Save the private case code shown after submission.</p></div></li>
        <li><span>03</span><div><h3>Return</h3><p>Check the status and updates using your code.</p></div></li>
      </ol>
    </section>
  </>;
}
