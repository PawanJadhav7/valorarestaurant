import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import OnboardingClient from "./OnboardingClient";

function stepFor(status: string | null | undefined) {
  if (!status || status === "started") return "profile";
  if (status === "profile_done") return "tenant";
  if (status === "tenant_done") return "pos";
  if (status === "complete") return "done";
  return "profile";
}

export default async function OnboardingPage() {
  const user = await getSessionUser();

  if (!user) redirect("/signin");

  const step = stepFor(user.onboarding_status);

  if (step === "tenant") redirect("/onboarding/tenant");
  if (step === "pos") redirect("/onboarding/pos");
  if (step === "done") redirect("/restaurant");

  return <OnboardingClient />;
}