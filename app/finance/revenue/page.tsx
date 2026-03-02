"use client";

import { RevenueTrendChart } from "../../components/finance/RevenueTrendChart";

export default function FinanceRevenuePage() {
  return (
    <div className="space-y-6">
      <RevenueTrendChart entityId="1" limit={24} />
    </div>
  );
}