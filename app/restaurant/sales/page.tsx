// app/restaurant/sales/page.tsx
import { SalesClient } from "./sales-client";
import { RevenueTrendChart } from "@/app/components/finance/RevenueTrendChart";

export const dynamic = "force-dynamic";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <SalesClient />
      <RevenueTrendChart entityId="1" limit={24} />
    </div>
  );
}