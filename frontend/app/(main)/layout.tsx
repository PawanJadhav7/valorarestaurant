//app/(main)/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { TopNav } from "@/components/layout/TopNav";

function TopNavFallback() {
  return <div className="h-[56px]" />;
}

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<TopNavFallback />}>
          <TopNav />
        </Suspense>
        <main className="flex-1">{children}</main>
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 background-gradients"
      />
    </>
  );
}