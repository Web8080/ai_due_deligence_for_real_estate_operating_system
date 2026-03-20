import Link from "next/link";

const pillars = [
  {
    title: "Deals",
    copy: "Move from intake to committee with stage gates, diligence surfaces, and operator-ready watchlists.",
  },
  {
    title: "Document Intelligence",
    copy: "Classify, summarize, and search deal documents with Ollama-first assistance and evidence-aware workflows.",
  },
  {
    title: "Investor Growth",
    copy: "Coordinate prospects, outreach momentum, commitments, and onboarding without losing relationship memory.",
  },
  {
    title: "Governance",
    copy: "Track audit events, integration posture, AI run history, and operating controls in one control plane.",
  },
];

export default function LandingPage() {
  return (
    <main className="public-shell">
      <header className="public-header">
        <Link href="/" className="public-brand">
          REOS
        </Link>
        <nav className="public-nav">
          <a href="#overview">Overview</a>
          <a href="#deals">Deals</a>
          <a href="#operations">Operations</a>
          <a href="#governance">Governance</a>
        </nav>
        <div className="public-actions">
          <Link href="/login" className="secondary-link">
            Sign in
          </Link>
          <Link href="/signup" className="primary-link">
            Access setup
          </Link>
        </div>
      </header>

      <section className="public-hero" id="overview">
        <div className="public-hero-copy">
          <p className="section-eyebrow">Enterprise Real Estate Operating System</p>
          <h1>Decision compression for acquisitions, diligence, investor growth, and governance.</h1>
          <p>
            REOS replaces fragmented deal trackers, inbox workflows, document silos, and ad hoc investor spreadsheets
            with one operating layer. The system is built for operators who need to move quickly without giving up
            traceability.
          </p>
          <div className="public-actions-row">
            <Link href="/login" className="primary-link">
              Open enterprise workspace
            </Link>
            <Link href="/app" className="secondary-link">
              View operator shell
            </Link>
          </div>
        </div>
        <div className="hero-grid-panel">
          <div className="hero-kpi">
            <span>Portfolio watch</span>
            <strong>Pipeline, committee, investors, workflows</strong>
          </div>
          <div className="hero-kpi">
            <span>AI posture</span>
            <strong>Ollama-first with governed escalation paths</strong>
          </div>
          <div className="hero-kpi">
            <span>Identity</span>
            <strong>Username and password sign-in with role-based access</strong>
          </div>
          <div className="hero-kpi">
            <span>Control plane</span>
            <strong>Integrations, automation, audit, monitoring</strong>
          </div>
        </div>
      </section>

      <section className="public-section" id="deals">
        <div className="section-heading">
          <p className="section-eyebrow">Operating Domains</p>
          <h2>The workspace is organized around actual execution pressure.</h2>
        </div>
        <div className="public-card-grid">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="public-card">
              <h3>{pillar.title}</h3>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section public-split" id="operations">
        <div className="public-card">
          <p className="section-eyebrow">Workflow</p>
          <h2>Execution lanes stay visible from intake through closing.</h2>
          <p>
            Active diligence, committee preparation, investor coordination, and exception handling stay in one shell so
            teams can manage blockers before they become surprises.
          </p>
        </div>
        <div className="public-card">
          <p className="section-eyebrow">AI Layer</p>
          <h2>Task-oriented AI, not novelty chat.</h2>
          <p>
            Every AI surface is framed around summaries, contradictions, next actions, relationship coverage, and
            executive briefings. Ollama remains the default provider, with enterprise overrides available when needed.
          </p>
        </div>
      </section>

      <section className="public-section" id="governance">
        <div className="public-card wide-public-card">
          <p className="section-eyebrow">Governance</p>
          <h2>Built to survive audit, scale pressure, and long-term ownership.</h2>
          <p>
            REOS tracks integration posture, AI activity, session state, and operating controls so the platform can
            evolve into a durable enterprise system rather than a polished prototype.
          </p>
        </div>
      </section>
    </main>
  );
}
