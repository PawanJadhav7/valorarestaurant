import { SectionCard } from "@/components/valora/SectionCard";

export default function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <SectionCard
        title="Subscription"
        subtitle="Placeholder. Next: plans, billing, and invoices."
      >
        <div className="text-sm text-muted-foreground">
          This page will be wired to Stripe later.
        </div>
      </SectionCard>
    </div>
  );
}