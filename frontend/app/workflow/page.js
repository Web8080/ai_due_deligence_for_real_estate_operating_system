import SectionPage from "../components/section-page";

export default function WorkflowPage() {
  return (
    <SectionPage
      eyebrow="Workflow"
      title="Execution Workflow"
      description="Coordinate internal users through role-aware stages from intake to investment decision with explicit controls."
      bullets={[
        "Create and progress deals through a defined stage model.",
        "Attach evidence, notes, and contact context to each deal.",
        "Keep analyst and manager responsibilities visible and auditable.",
      ]}
    />
  );
}
