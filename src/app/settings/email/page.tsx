import EmailSettings from "@/components/EmailSettings";

export default function EmailSettingsPage({ searchParams }: { searchParams: { connected?: string; error?: string } }) {
  return <EmailSettings connected={searchParams.connected} error={searchParams.error} />;
}
