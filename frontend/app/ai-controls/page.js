import SectionPage from "../components/section-page";

export default function AIControlsPage() {
  return (
    <SectionPage
      eyebrow="AI controls"
      title="AI Control Framework"
      description="Keep AI usage grounded, observable, and auditable with explicit controls around evidence and fallback behavior."
      bullets={[
        "Evidence-first prompts with citation requirements.",
        "Provider fallback paths for resilience during outages.",
        "Operational review of confidence and uncertainty signaling.",
      ]}
    />
  );
}
