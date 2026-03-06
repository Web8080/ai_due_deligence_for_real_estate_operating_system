import SectionPage from "../components/section-page";

export default function ProductPage() {
  return (
    <SectionPage
      eyebrow="Product"
      title="Real Estate Operating System"
      description="A unified internal product layer for deal execution, documents, CRM, and evidence-grounded analysis."
      bullets={[
        "Centralize workflows currently split across email, spreadsheets, and point tools.",
        "Standardize stage progression and ownership across acquisitions teams.",
        "Track outcomes with measurable operating and diligence metrics.",
      ]}
    />
  );
}
