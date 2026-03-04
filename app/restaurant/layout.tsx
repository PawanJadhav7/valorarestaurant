// app/restaurant/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";
import { getSessionUser } from "@/lib/auth";

export default async function RestaurantLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/signin");
  if (user.onboarding_status !== "complete") redirect("/onboarding");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Make the whole restaurant area viewport-height */}
      <div className="grid h-[calc(100dvh-3rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar column: sticky + fixed height */}
        <div className="h-full">
          <RestaurantSidebar />
        </div>

        {/* Main column: scrolls */}
        <main className="h-full overflow-y-auto rounded-3xl">
          {children}
        </main>
      </div>
    </div>
  );
}