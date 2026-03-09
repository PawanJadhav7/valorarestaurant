//app/finance/layout.tsx
import type { ReactNode } from "react";
import { FinanceSidebar } from "@/components/finance/FinanceSidebar";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <FinanceSidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}