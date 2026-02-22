import { Glass } from "@/components/ui/Glass";
import { GlassButton } from "@/components/ui/GlassButton";
import { RestaurantKpiTile } from "@/components/restaurant/KpiTile";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      {/* Background that makes glass look “alive” */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.35), transparent 45%)," +
            "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.25), transparent 50%)," +
            "radial-gradient(circle at 40% 90%, rgba(34,197,94,0.20), transparent 55%)," +
            "linear-gradient(180deg, rgba(0,0,0,0.04), transparent 40%)",
        }}
      />

      <div className="mx-auto max-w-5xl space-y-6">
        
        <Glass className="p-6">
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Valora AI</h1>
              <p className="text-sm opacity-80">
                Glass material (blur + vibrancy) with light/dark support.
              </p>
            </div>
            <div className="flex gap-2">
              <GlassButton>Primary Hello</GlassButton>
              <GlassButton className="opacity-90">Secondary</GlassButton>
            </div>
          </div>
        </Glass>

        <div className="grid gap-4 md:grid-cols-3">KpiTile
          
          <Glass className="p-5">
            <div className="text-sm opacity-80">MRR</div>
            <div className="text-2xl font-semibold">$128,400</div>
          </Glass>
          <Glass className="p-5">
            <div className="text-sm opacity-80">Gross Margin</div>
            <div className="text-2xl font-semibold">68.2%</div>
          </Glass>
          <Glass className="p-5">
            <div className="text-sm opacity-80">Churn</div>
            <div className="text-2xl font-semibold">1.4%</div>
          </Glass>
        </div>

        <Glass className="p-6">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-2 text-sm opacity-80">
            Use glass sparingly in dashboards: top nav, sidebars, modals. Keep
            dense tables more opaque for readability.
          </p>
        </Glass>
      </div>
      
    </main>
  );
}