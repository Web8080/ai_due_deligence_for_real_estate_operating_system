// Author: Victor.I
// Static content aligned with docs/reos-ai-automation-overleaf-presentation.tex

export const firmLifecycle = [
  { title: "Origination", detail: "Sourcing, screening, early underwriting hooks" },
  { title: "Underwriting & diligence", detail: "Financial models, legal, environmental, tenant, capex" },
  { title: "Investor relations", detail: "Materials, Q&A, subscriptions, reporting" },
  { title: "Closing", detail: "Dependencies, signatures, funding, conditions" },
  { title: "Asset management", detail: "Operations, capex, leasing, dispositions" },
  { title: "Fundraising & reporting", detail: "LP communications, compliance narratives" },
];

export const executivePain = [
  {
    role: "Managing Director",
    items: ["Committee prep, exceptions, capital calls", "Relationship repair, narrative control"],
  },
  {
    role: "Head of Acquisitions",
    items: ["Pipeline triage, broker management, kill/continue calls"],
  },
  {
    role: "Analyst",
    items: ["Models, comps, document sweeps, slide churn"],
  },
  {
    role: "IR / CFO",
    items: ["Data rooms, investor questions, forecasts, audits"],
  },
];

export const productStrategy = [
  {
    title: "Decision Compression",
    principle:
      "The system compresses scattered information into recommended decisions, not just dashboards.",
    bullets: [
      "Fewer tabs, fewer reconciliations—clear decision deltas and exceptions",
      "Deal kill-switch: reject weak opportunities earlier with explicit rationale",
      "Committee prep: predicted discussion themes, vote risk, pre-drafted packets",
    ],
  },
  {
    title: "Relationship Memory Graph",
    bullets: [
      "Contacts, companies, brokers, investors, lenders, vendors as a graph—not flat CRM rows",
      "Counterparty reliability scoring (sellers, brokers, lenders, vendors)",
      "Reusable diligence memory across similar deals and markets",
      "Living narratives: notes and documents synthesized into deal and relationship stories",
    ],
  },
  {
    title: "Closing Autopilot",
    bullets: [
      "Dependency-aware closing workflows, automated chasing",
      "Close-readiness score, funding risk visibility",
    ],
  },
  {
    title: "Executive Copilot",
    bullets: ["Daily / weekly operating briefs", "Exception-based leadership—not task-by-task management"],
  },
  {
    title: "Investor Growth Engine",
    bullets: [
      "Discovery, qualification, fit scoring, enrichment",
      "Outreach suggestions, materials, investor-room orchestration",
      "Email-driven decision tracking: interpret responses → proposed CRM updates",
      "Self-service dashboards, AI Q&A on investments, distribution forecasts",
    ],
  },
];

export const growthAxes = [
  "Close deals faster — screening, diligence, closing compression",
  "Raise more capital — investor discovery, onboarding, intelligence",
  "Operate the portfolio — asset management, reporting, exceptions",
];

export const investorLifecycleStages = [
  {
    stage: "Discovery",
    detail: "Who fits the mandate; autonomous research with human approval on outreach",
  },
  {
    stage: "Qualification",
    detail: "Capacity, sophistication, conflicts; checkpoints on classification",
  },
  {
    stage: "Onboarding",
    detail: "Materials, Q&A, subscription workflow; legal/KYC human gates",
  },
  {
    stage: "Active relationship",
    detail: "Reporting, re-ups, co-invest; AI drafts, humans send",
  },
  {
    stage: "Ongoing management",
    detail: "Intelligence, churn risk, next-best-action suggestions",
  },
];

export const mondayMorning = [
  "New deals scored and ranked; weak names flagged early",
  "Diligence gaps and contradictions surfaced with doc citations",
  "Hot investor prospects and response patterns highlighted",
  "Drafts: IC memos, weekly LP updates, committee decks (human edits)",
  "Analyst load rebalanced against deadlines and skill",
];

export const automationGroups = [
  { range: "1-5", theme: "Deal origination and screening" },
  { range: "6-10", theme: "Underwriting and financial analysis" },
  { range: "11-18", theme: "Document processing and intelligence" },
  { range: "19-26", theme: "Investor relations and capital raising" },
  { range: "27-31", theme: "Portfolio operations and asset management" },
  { range: "32-36", theme: "Reporting and communication" },
  { range: "37-41", theme: "Team operations and productivity" },
  { range: "42-46", theme: "Analytics and decision support" },
  { range: "47-50", theme: "Compliance and risk management" },
];

export const pipelineExamples = [
  {
    name: "Deal intake",
    steps: ["Ingest", "Normalize", "Score", "Human: go/no-go", "CRM graph update"],
  },
  {
    name: "Investor outreach",
    steps: ["Segment", "Draft", "Human: approve send", "Track replies", "Suggest CRM status"],
  },
  {
    name: "Quarterly reporting",
    steps: ["Pull metrics", "Draft LP letter", "Human: sign-off", "Distribute & archive"],
  },
];

export const oversightRhythm = [
  { cadence: "Daily", detail: "~15 minutes: exceptions, risk flags, capital/funding alerts" },
  { cadence: "Weekly", detail: "~60 minutes: pipeline, investor momentum, diligence themes" },
  { cadence: "Monthly", detail: "Half day: strategy, mandate, integration and model changes" },
];

export const compounding = [
  "Data flywheel — every deal and investor interaction improves models and rules",
  "Investor knowledge accumulates across funds and vintages",
  "Process encoding — what worked becomes default playbooks",
  "Institutional memory survives turnover",
];

export const competitiveMoat = [
  "Proprietary training data and labels tied to your outcomes",
  "Process encoding competitors cannot copy without your operations",
  "Relationship intelligence graph (not exportable as a CSV)",
  "Speed and cost structure once automation is embedded",
];

export const integrationBlueprint = [
  "Microsoft Graph",
  "Gmail API",
  "Calendly API",
  "Zoom API",
  "DocuSign API",
  "Dropbox Sign API",
  "FRED (macro rates) / curve overlays",
  "Bloomberg / Refinitiv / ICE (institutional, licensed)",
  "CompStak / Reonomy / RentCast",
  "SEC EDGAR / filings",
  "Apollo.io",
  "Snov.io",
  "Grata",
  "Alloy (KYC/AML)",
  "Parallel Markets / iCapital",
  "Plaid",
  "Juniper Square",
  "Yardi / AppFolio",
  "Slack / Microsoft Teams",
];
