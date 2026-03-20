"use client";
// Author: Victor.I
// Overview: KPIs, decision-velocity proxy, and OS coverage for core operator workflows.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { authHeaders, fetchJson, getApiBase } from "../lib/reos-client";
import { useAuth } from "../components/auth-provider";

export default function DashboardPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");
  const [seedBusy, setSeedBusy] = useState(false);

  const loadDashboard = useCallback(() => {
    if (!auth?.token) return;
    const h = { Authorization: `Bearer ${auth.token}` };
    setError("");
    Promise.all([
      fetchJson(`${API}/dashboard/data`, { headers: h }),
      fetchJson(`${API}/executive/briefing`, { headers: h }).catch(() => ({ lines: [] })),
    ])
      .then(([dash, brief]) => {
        setData(dash);
        setBriefing(brief?.lines || []);
      })
      .catch((e) => setError(e.message || "Failed to load dashboard"));
  }, [API, auth?.token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function runDemoSeed() {
    if (!auth?.token) return;
    setSeedBusy(true);
    setSeedMsg("");
    try {
      const result = await fetchJson(`${API}/demo/seed`, {
        method: "POST",
        headers: authHeaders(auth.token),
      });
      setSeedMsg(
        `Loaded demo workspace: ${result.deals_created} deals, ${result.contacts_created} contacts, ${result.workflow_tasks_added} workflow tasks.`
      );
      loadDashboard();
    } catch (e) {
      setSeedMsg(e?.message || "Could not run demo seed.");
    } finally {
      setSeedBusy(false);
    }
  }

  if (error) {
    return (
      <div className="dashboard-wrap">
        <p className="inline-alert alert-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-wrap">
        <p className="muted-copy">Loading dashboard...</p>
      </div>
    );
  }

  const {
    kpis,
    revenue_forecast,
    market_trends,
    tasks,
    sales_pipeline,
    top_properties,
    top_agents,
    activity_feed,
    performance_score,
    performance_max,
    performance_label,
    performance_subtitle,
  } = data;

  const canSeed = auth?.role === "admin" || auth?.role === "manager";
  const activeDealsKpi = kpis.find((k) => k.label === "Active deals");
  const workspaceEmpty = activeDealsKpi && activeDealsKpi.value === "0";

  const maxPrice = Math.max(...market_trends.map((d) => d.median_sale_price), 1);
  const pipelineMax = Math.max(...sales_pipeline.map((s) => s.value), 1);

  return (
    <div className="dashboard-wrap">
      <header className="dashboard-page-head">
        <h1 className="dashboard-page-title">Overview</h1>
        <p className="dashboard-page-lead">
          Six operator jobs live in-app: find deals, organise contacts, track stages, review documents, chase investors, and shrink
          manual reporting. The headline KPI below tracks calendar pressure from intake toward IC-quality decisions.
        </p>
      </header>

      {data.decision_velocity ? (
        <section className="dashboard-widget dashboard-decision-velocity" aria-labelledby="dv-heading">
          <h2 id="dv-heading">Discovery to decision (OS KPI)</h2>
          <p className="dashboard-briefing-sub">{data.decision_velocity.headline}</p>
          <div className="decision-velocity-primary">
            <span className="decision-velocity-value">{data.decision_velocity.primary_value}</span>
            <p className="decision-velocity-sub">{data.decision_velocity.primary_subtext}</p>
          </div>
          <ul className="decision-velocity-metrics">
            {(data.decision_velocity.metrics || []).map((m) => (
              <li key={m.label}>
                <strong>{m.label}</strong> {m.value}
              </li>
            ))}
            {data.decision_velocity.median_days_to_diligence ? (
              <li>
                <strong>Intake to diligence (median)</strong> {data.decision_velocity.median_days_to_diligence}
              </li>
            ) : null}
            {data.decision_velocity.median_days_in_investment_committee ? (
              <li>
                <strong>IC lane dwell (median)</strong> {data.decision_velocity.median_days_in_investment_committee}
              </li>
            ) : null}
          </ul>
          <p className="muted-copy dashboard-methodology">{data.decision_velocity.methodology_note}</p>
        </section>
      ) : null}

      {data.operating_capabilities?.length ? (
        <section className="dashboard-widget" aria-labelledby="oc-heading">
          <h2 id="oc-heading">Core problems covered in the OS</h2>
          <p className="dashboard-briefing-sub">Each row maps to a live screen. Partial means the surface exists but export or depth is still thin.</p>
          <div className="os-capability-grid">
            {data.operating_capabilities.map((row) => (
              <article key={row.id} className={`os-capability-card os-status-${row.status}`}>
                <div className="os-capability-top">
                  <span className="os-capability-status">{row.status}</span>
                  <h3>{row.problem}</h3>
                </div>
                <p className="os-capability-detail">{row.detail}</p>
                <Link href={row.route_path} className="os-capability-link">
                  {row.route_label}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {workspaceEmpty && canSeed ? (
        <section className="dashboard-widget dashboard-briefing" aria-labelledby="empty-workspace-heading">
          <h2 id="empty-workspace-heading">Empty workspace</h2>
          <p className="dashboard-briefing-sub">
            Load the bundled demonstration dataset so deals, CRM, documents, and workflow views match a mid-stage operating
            picture. No third-party APIs required.
          </p>
          <button type="button" className="ghost-button" onClick={runDemoSeed} disabled={seedBusy}>
            {seedBusy ? "Seeding..." : "Load demonstration data"}
          </button>
          {seedMsg ? <p className="muted-copy" style={{ marginTop: "12px" }}>{seedMsg}</p> : null}
        </section>
      ) : null}

      {briefing?.length ? (
        <section className="dashboard-widget dashboard-briefing" aria-labelledby="briefing-heading">
          <h2 id="briefing-heading">Executive briefing</h2>
          <p className="dashboard-briefing-sub">Recent exceptions, diligence, and investor motion.</p>
          <ul className="dashboard-briefing-list">
            {briefing.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-kpis">
        {kpis.map((kpi, i) => (
          <div key={i} className="dashboard-kpi-card">
            <span className="dashboard-kpi-label">{kpi.label}</span>
            <span className="dashboard-kpi-value">{kpi.value}</span>
            <span className={`dashboard-kpi-change ${kpi.change_positive ? "positive" : ""}`}>{kpi.change}</span>
          </div>
        ))}
        <div className="dashboard-kpi-card dashboard-kpi-forecast">
          <span className="dashboard-kpi-label">Capital / deploy</span>
          <span className="dashboard-kpi-value">{revenue_forecast.value}</span>
          <span className="dashboard-kpi-change positive">{revenue_forecast.change}</span>
          <span className="dashboard-kpi-sublabel">{revenue_forecast.label}</span>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-widget dashboard-widget-map">
          <h3>Geography</h3>
          <div className="dashboard-map-placeholder">
            <span>Active markets (summary)</span>
            <div className="dashboard-map-legend">
              <span className="dot listed">In pipeline</span>
              <span className="dot sold">Closed</span>
            </div>
          </div>
        </div>

        <div className="dashboard-widget dashboard-widget-chart">
          <h3>Activity index (6 mo)</h3>
          <div className="dashboard-chart">
            <div className="dashboard-chart-bars">
              {market_trends.map((point, i) => (
                <div key={i} className="dashboard-chart-bar-col">
                  <div
                    className="dashboard-chart-bar"
                    style={{ height: `${(point.median_sale_price / maxPrice) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="dashboard-chart-x">
              {market_trends.map((p, i) => (
                <span key={i}>{p.month}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-widget dashboard-widget-tasks">
          <h3>Tasks</h3>
          <ul className="dashboard-tasks-list">
            {tasks.map((t, i) => (
              <li key={i}>
                <span className="task-assignee">{t.assignee}</span>
                <span className="task-desc">{t.description}</span>
                <span className="task-time">{t.time_ago}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-widget dashboard-widget-pipeline">
          <h3>Deal pipeline</h3>
          <div className="dashboard-pipeline">
            {sales_pipeline.map((stage, i) => (
              <div key={i} className="dashboard-pipeline-stage" style={{ ["--color"]: stage.color }}>
                <div className="dashboard-pipeline-bar" style={{ width: `${(stage.value / pipelineMax) * 100}%` }} />
                <span className="dashboard-pipeline-label">
                  {stage.name}: {stage.count} (${stage.value.toLocaleString()})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-widget dashboard-widget-properties">
          <h3>Highlighted deals</h3>
          <div className="dashboard-props-list">
            {top_properties.map((p, i) => (
              <div key={i} className="dashboard-prop-row">
                <span className="prop-address">{p.address}</span>
                <span className="prop-agent">{p.agent}</span>
                <span className="prop-price">${p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-widget dashboard-widget-agents">
          <h3>Deal teams</h3>
          <ul className="dashboard-agents-list">
            {top_agents.map((a, i) => (
              <li key={i}>
                <span className="agent-name">{a.name}</span>
                <span className="agent-stats">
                  {a.sales_count} active, ${(a.total_sales / 1e6).toFixed(0)}M notional
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-widget dashboard-widget-activity">
          <h3>Activity</h3>
          <ul className="dashboard-activity-list">
            {activity_feed.map((a, i) => (
              <li key={i}>
                <span>{a.title}</span>
                <span className="due">{a.due}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-widget dashboard-widget-performance">
          <h3>Operating rhythm</h3>
          <div className="dashboard-performance">
            <div className="dashboard-gauge-wrap">
              <div
                className="dashboard-gauge"
                style={{ ["--score"]: performance_score, ["--max"]: performance_max }}
              />
              <span className="dashboard-gauge-value">{performance_score}</span>
            </div>
            <p className="dashboard-gauge-label">{performance_label}</p>
            <p className="dashboard-gauge-subtitle">{performance_subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
