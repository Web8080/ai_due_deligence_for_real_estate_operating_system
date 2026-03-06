import SectionPage from "../components/section-page";

export default function AIEnginePage() {
  return (
    <SectionPage
      eyebrow="AI Engine"
      title="Grounded AI for Diligence"
      description="Run retrieval-based analysis with citation traceability and provider fallback controls for operational resilience."
      bullets={[
        "Chunking and embedding pipeline for uploaded diligence documents.",
        "Citation-backed answers tied to retrieved deal context.",
        "Provider strategy with local Ollama and Azure OpenAI readiness.",
      ]}
    />
  );
}
