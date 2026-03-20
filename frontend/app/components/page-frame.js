"use client";

export default function PageFrame({ eyebrow, title, subtitle, actions, children }) {
  return (
    <section className="workspace-page">
      <div className="page-frame-head">
        <div>
          {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
