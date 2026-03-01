// app/restaurant/ops/alerts/page.tsx
export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
        <div className="text-lg font-semibold text-foreground">Alerts</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Placeholder. Next: alert feed, severity rules, snooze/acknowledge, and alert history.
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/15 p-4">
            <div className="text-sm font-semibold text-foreground">Planned features</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Unified alert feed (labor, inventory, sales)</li>
              <li>Acknowledge / snooze with audit trail</li>
              <li>Alert thresholds per location</li>
              <li>Drivers + recommended actions</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-background/15 p-4">
            <div className="text-sm font-semibold text-foreground">Data needed</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Fact tables: sales_daily, labor_daily, inventory_daily</li>
              <li>Targets/thresholds table per tenant/location</li>
              <li>Alert snapshot table (daily)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}