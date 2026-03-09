// app/(marketing)/layout.tsx
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Same "alive" glass background as app/restaurant/layout.tsx */}
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

      <div className="mx-auto max-w-[1400px] px-4 py-6">{children}</div>
    </div>
  );
}