import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

// function stepFor(status: string | null | undefined) {
//   if (!status || status === "started") return "profile";
//   if (status === "profile_done") return "tenant";
//   if (status === "tenant_done") return "subscription";
//   if (status === "complete") return "done";
//   return "profile";
// }

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/signin");

  return <>{children}</>;
}