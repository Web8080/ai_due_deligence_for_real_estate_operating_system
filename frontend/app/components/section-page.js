import Link from "next/link";

export default function SectionPage({ eyebrow, title, description, bullets }) {
  return (
    <main className="container">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="title">{title}</h1>
      <p className="hero-copy">{description}</p>
      <div className="actions" style={{ marginTop: 12 }}>
        <Link href="/app" className="button-link">
          Open workspace
        </Link>
        <Link href="/" className="button-link button-secondary">
          Back to landing
        </Link>
      </div>
      <section className="card">
        <h2>What this page covers</h2>
        <ul className="list">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
