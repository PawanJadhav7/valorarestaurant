// app/restaurant/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";
import { getSessionUser } from "@/lib/auth";

export default async function RestaurantLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/login"); // or "/auth/signin"
  if (user.onboarding_status !== "complete") redirect("/onboarding");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <RestaurantSidebar />
        <div>{children}</div>
      </div>
    </div>
  );
}