import SectionPage from "../components/section-page";

export default function OperationsPage() {
  return (
    <SectionPage
      eyebrow="Operations"
      title="Operational Control Surface"
      description="Manage readiness, automation priorities, and risk controls so teams can execute reliably at scale."
      bullets={[
        "Monitor integration readiness across identity, AI, and storage.",
        "Prioritize automation rollout by impact and implementation effort.",
        "Track operational challenges before they become incidents.",
      ]}
    />
  );
}
