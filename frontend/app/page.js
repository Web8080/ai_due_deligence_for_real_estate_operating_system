import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main>
      <header className="landing-header">
        <div className="container header-inner">
          <div className="brand">REOS</div>
          <nav className="nav-links">
            <Link href="/product">Product</Link>
            <Link href="/ai-engine">AI Engine</Link>
            <Link href="/workflow">Workflow</Link>
            <Link href="/platform">Platform</Link>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="button-link button-secondary">
              Sign in
            </Link>
            <Link href="/signup" className="button-link">
              Create user
            </Link>
          </div>
        </div>
      </header>

      <section className="container landing-hero">
        <div>
          <p className="eyebrow">Real Estate Operating System</p>
          <h1 className="hero-title">Internal operating platform for acquisitions and due diligence</h1>
          <p className="hero-copy">
            Replace fragmented tools with one platform for deal pipeline, documents, investor CRM, and
            AI-grounded underwriting answers.
          </p>
          <div className="actions">
            <Link href="/signup" className="button-link">
              Create organization user
            </Link>
            <Link href="/login" className="button-link button-secondary">
              Login to dashboard
            </Link>
          </div>
        </div>
        <div className="hero-image-wrap">
          <Image
            src="/images/hero-dashboard.svg"
            alt="REOS dashboard preview"
            width={800}
            height={520}
            className="hero-image"
            priority
          />
        </div>
      </section>

      <section id="product" className="container landing-section">
        <h2>Everything in one operating layer</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Deal pipeline</h3>
            <p>Move opportunities from screening to committee with a consistent stage model.</p>
          </article>
          <article className="feature-card">
            <h3>Document system</h3>
            <p>Upload leases, legal docs, and memos with extraction, chunking, and traceable storage.</p>
          </article>
          <article className="feature-card">
            <h3>Investor CRM</h3>
            <p>Track contacts, counterparties, and interactions linked directly to each deal.</p>
          </article>
          <article className="feature-card">
            <h3>AI due diligence</h3>
            <p>Ask portfolio questions and receive grounded responses with document citations.</p>
          </article>
        </div>
      </section>

      <section id="ai" className="container landing-two-col">
        <div className="section-copy">
          <p className="eyebrow">AI layer</p>
          <h2>Grounded AI analysis with evidence</h2>
          <p>
            Query uploaded documents and get responses tied to retrieved context. The system is designed for
            traceability, fallback behavior, and operational reliability.
          </p>
          <ul className="list">
            <li>Embeddings + retrieval pipeline</li>
            <li>Citation-backed answer output</li>
            <li>Ollama-first local runtime support</li>
            <li>Graceful fallback chain for resilience</li>
          </ul>
        </div>
        <Image src="/images/section-ai.svg" alt="AI analysis section" width={640} height={360} className="section-img" />
      </section>

      <section id="workflow" className="container landing-two-col reverse">
        <div className="section-copy">
          <p className="eyebrow">Execution workflow</p>
          <h2>Designed for team operations, not demos</h2>
          <p>
            Users can sign in as admins, managers, or analysts, then execute deal creation, uploads, and AI query
            workflows in a role-aware dashboard.
          </p>
        </div>
        <Image
          src="/images/section-workflow.svg"
          alt="Workflow stages section"
          width={640}
          height={360}
          className="section-img"
        />
      </section>

      <section id="platform" className="container landing-section">
        <h2>Platform operating modes</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Local secure mode</h3>
            <p>Run with SQLite, local OCR, and Ollama for internal-only development and offline testing.</p>
          </article>
          <article className="feature-card">
            <h3>Operations mode</h3>
            <p>Deploy with role-based access, persistent data controls, and monitored workflow execution.</p>
          </article>
          <article className="feature-card">
            <h3>Governed mode</h3>
            <p>Extend with stricter auditability, incident visibility, and change management controls.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <strong>REOS Internal Platform</strong>
            <p>Real Estate Operating System for controlled diligence, document analysis, and execution workflows.</p>
            <div className="footer-badges">
              <span>Internal Use Only</span>
              <span>Role-Based Access</span>
              <span>Audit Ready</span>
            </div>
          </div>
          <div className="footer-column">
            <h4>Platform</h4>
            <div className="footer-links">
              <Link href="/platform">Platform</Link>
              <Link href="/workspace">Workspace</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create user</Link>
            </div>
          </div>
          <div className="footer-column">
            <h4>Operations</h4>
            <div className="footer-links">
              <Link href="/operations">Operations</Link>
              <Link href="/workflow-stages">Workflow stages</Link>
              <Link href="/ai-controls">AI controls</Link>
              <Link href="/operating-modes">Operating modes</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
