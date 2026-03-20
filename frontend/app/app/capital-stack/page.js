"use client";
// Author: Victor.I
// Hub for financing layers per deal. Full persistence lives on the roadmap; this page is visible in nav and ties to deal workspaces.

import Link from "next/link";
import { useEffect, useState } from "react";

import PageFrame from "../../components/page-frame";
import { useAuth } from "../../components/auth-provider";
import { fetchJson, getApiBase } from "../../lib/reos-client";

function formatCurrencyShort(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Illustrative sizing when no modeled stack exists yet (not stored in DB).
function demoStackForDeal(deal) {
  const seed = (deal.id || 1) % 5;
  const base = 18 + seed * 7;
  const seniorPct = 0.58 + seed * 0.02;
  const mezzPct = 0.12 - seed * 0.01;
  const prefPct = 0.15;
  const commonPct = Math.max(0.08, 1 - seniorPct - mezzPct - prefPct);
  const total = base * 1_000_000;
  return {
    totalNotional: total,
    senior: total * seniorPct,
    mezz: total * mezzPct,
    prefEquity: total * prefPct,
    commonEquity: total * commonPct,
    ltvBand: `${Math.round(seniorPct * 100)}–${Math.round((seniorPct + 0.04) * 100)}% LTC (illustrative)`,
  };
}

export default function CapitalStackPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/deals`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setDeals)
      .catch((e) => setError(e.message || "Failed to load deals"));
  }, [API, auth?.token]);

  return (
    <PageFrame
      eyebrow="Portfolio"
      title="Capital stack"
      subtitle="Financing layers by deal: senior debt, mezzanine, preferred equity, and common equity. Links open the deal workspace for diligence and documents."
    >
      {error ? <p className="inline-alert alert-error">{error}</p> : null}

      <section className="surface-card" style={{ marginBottom: "18px" }}>
        <h2 className="playbook-h2" style={{ marginTop: 0 }}>
          Scope
        </h2>
        <p className="feature-copy">
          This screen is the navigation home for capital structure. Backing models, covenant sets, and live lender quotes are not yet
          stored in the API; the table below uses illustrative splits so acquisition teams can rehearse the layout. Next step is a
          capital_tranches table keyed by deal_id and edit flows gated by role.
        </p>
      </section>

      <div className="playbook-table-wrap">
        <table className="playbook-table">
          <thead>
            <tr>
              <th scope="col">Deal</th>
              <th scope="col">Stage</th>
              <th scope="col">Total stack (demo)</th>
              <th scope="col">Senior</th>
              <th scope="col">Mezz</th>
              <th scope="col">Pref eq</th>
              <th scope="col">Common</th>
              <th scope="col">Leverage note</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted-copy">
                  No deals yet. Load demonstration data from Overview or add deals from Intake.
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const s = demoStackForDeal(deal);
                return (
                  <tr key={deal.id}>
                    <td>
                      <Link href={`/app/deals/${deal.id}`} className="table-link">
                        <strong>{deal.name}</strong>
                      </Link>
                    </td>
                    <td>{deal.stage}</td>
                    <td>{formatCurrencyShort(s.totalNotional)}</td>
                    <td>{formatCurrencyShort(s.senior)}</td>
                    <td>{formatCurrencyShort(s.mezz)}</td>
                    <td>{formatCurrencyShort(s.prefEquity)}</td>
                    <td>{formatCurrencyShort(s.commonEquity)}</td>
                    <td className="muted-copy">{s.ltvBand}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
