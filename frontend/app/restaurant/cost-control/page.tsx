// app/restaurant/cost-control/page.tsx
export default function CostControlPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
        <div className="text-lg font-semibold text-foreground">Cost Control</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Placeholder. Next: prime cost, COGS & labor trends, variance vs targets, and savings actions.
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/15 p-4">
            <div className="text-sm font-semibold text-foreground">Core KPIs</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>COGS % (Food cost)</li>
              <li>Labor %</li>
              <li>Prime Cost %</li>
              <li>Waste % + Stockouts</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-background/15 p-4">
            <div className="text-sm font-semibold text-foreground">Next build</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Targets & thresholds per location</li>
              <li>Variance explanations (drivers)</li>
              <li>Action tracker (owner + due date)</li>
              <li>Weekly report export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}