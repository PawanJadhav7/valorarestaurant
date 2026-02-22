// app/restaurant/layout.tsx
import type { ReactNode } from "react";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Global "alive" glass background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.35), transparent 45%)," +
            "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.25), transparent 50%)," +
            "radial-gradient(circle at 40% 90%, rgba(34,197,94,0.20), transparent 55%)," +
            "linear-gradient(180deg, rgba(0,0,0,0.04), transparent 40%)",
        }}
      />

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <RestaurantSidebar />
          </aside>

          <main className="min-w-0 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}