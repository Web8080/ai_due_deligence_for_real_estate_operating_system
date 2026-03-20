"use client";
// Author: Victor.I
// Simple CRM graph from GET /crm/graph (companies, contacts, deals).

export default function RelationshipGraph({ nodes, edges }) {
  if (!nodes?.length) {
    return <p className="muted-copy">No graph nodes yet. Add contacts linked to companies or deals.</p>;
  }

  const byId = new Map(nodes.map((n, i) => [n.id, { ...n, i }]));
  const col = { company: 0, contact: 1, deal: 2 };
  const rowCount = [0, 0, 0];
  const positions = {};
  const colX = [90, 260, 430];
  const rowH = 56;

  nodes.forEach((n) => {
    const c = col[n.node_type] ?? 1;
    const r = rowCount[c]++;
    positions[n.id] = { x: colX[c], y: 40 + r * rowH };
  });

  const w = 560;
  const h = Math.max(200, Math.max(...Object.values(positions).map((p) => p.y)) + 60);

  return (
    <div className="relationship-graph-wrap">
      <svg className="relationship-graph-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Relationship graph">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#5a8f7a" />
          </marker>
        </defs>
        {edges.map((e, idx) => {
          const a = positions[e.source];
          const b = positions[e.target];
          if (!a || !b) return null;
          return (
            <line
              key={`${e.source}-${e.target}-${idx}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="relationship-graph-edge"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        {nodes.map((n) => {
          const p = positions[n.id];
          if (!p) return null;
          const fill =
            n.node_type === "company" ? "rgba(59,130,246,0.35)" : n.node_type === "deal" ? "rgba(34,197,94,0.35)" : "rgba(167,139,250,0.35)";
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              <circle r="22" fill={fill} stroke="rgba(138,187,160,0.5)" strokeWidth="1" />
              <text textAnchor="middle" dy="4" className="relationship-graph-label" fontSize="9">
                {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="relationship-graph-legend">
        <span>
          <span className="relationship-graph-dot relationship-graph-dot-company" /> Company
        </span>
        <span>
          <span className="relationship-graph-dot relationship-graph-dot-contact" /> Contact
        </span>
        <span>
          <span className="relationship-graph-dot relationship-graph-dot-deal" /> Deal
        </span>
      </div>
    </div>
  );
}
