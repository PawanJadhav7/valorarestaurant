// app/onboarding/page.tsx
import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient"; // <-- match file name exactly

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1100px] px-4 py-10 text-sm text-muted-foreground">Loading onboarding...</div>}>
      <OnboardingClient />
    </Suspense>
  );
}