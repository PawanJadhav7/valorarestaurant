// app/restaurant/layout.tsx
import type { ReactNode } from "react";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* soft background wash */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-24 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-3xl opacity-30 bg-muted" />
        <div className="absolute -bottom-24 right-1/3 h-[420px] w-[640px] rounded-full blur-3xl opacity-25 bg-muted" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <RestaurantSidebar />
          </aside>

          {/* main surface (subtle glass frame) */}
          <main className="min-w-0">
            <div className="glass rounded-2xl p-3 md:p-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}