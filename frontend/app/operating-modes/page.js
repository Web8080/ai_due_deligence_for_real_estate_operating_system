import SectionPage from "../components/section-page";

export default function OperatingModesPage() {
  return (
    <SectionPage
      eyebrow="Operating modes"
      title="Operating Mode Profiles"
      description="Select the right runtime profile for development, deployment, and governance without changing product behavior."
      bullets={[
        "Local secure mode for internal development and offline testing.",
        "Operations mode for persistent controls and active monitoring.",
        "Governed mode for stronger auditability and change control.",
      ]}
    />
  );
}
