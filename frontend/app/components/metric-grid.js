"use client";

export default function MetricGrid({ items }) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <article key={item.label} className="metric-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail ? <p>{item.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}
