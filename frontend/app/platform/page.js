import SectionPage from "../components/section-page";

export default function PlatformPage() {
  return (
    <SectionPage
      eyebrow="Platform"
      title="Platform Architecture"
      description="Operate REOS with local-first development and a hardened path to enterprise deployment and governance."
      bullets={[
        "Local mode for offline development and validation.",
        "Operations mode for controlled runtime and monitoring.",
        "Governed mode for stricter audit and change management.",
      ]}
    />
  );
}
