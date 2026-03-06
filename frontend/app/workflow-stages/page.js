import SectionPage from "../components/section-page";

export default function WorkflowStagesPage() {
  return (
    <SectionPage
      eyebrow="Workflow stages"
      title="Deal Stage Model"
      description="Use a consistent stage model to reduce ambiguity and enforce handoffs across screening and diligence."
      bullets={[
        "Lead",
        "Screening",
        "Due Diligence",
        "Investment Committee",
        "Approved / Rejected",
      ]}
    />
  );
}
