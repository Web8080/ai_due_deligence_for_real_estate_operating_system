import SectionPage from "../components/section-page";

export default function WorkspacePage() {
  return (
    <SectionPage
      eyebrow="Workspace"
      title="Internal Workspace"
      description="Use the role-aware dashboard to manage live deal operations, analytics, notes, documents, and AI support."
      bullets={[
        "Deal and contact workflows in one operational interface.",
        "Document upload, extraction, and AI query in the same flow.",
        "Analytics and timeline visibility for daily execution.",
      ]}
    />
  );
}
