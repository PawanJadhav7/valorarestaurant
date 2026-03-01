// app/onboarding/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  // Not logged in → go login
  if (!user) redirect("/login");

  // Already complete → go dashboard
  if (user.onboarding_status === "complete") redirect("/restaurant");

  return <>{children}</>;
}