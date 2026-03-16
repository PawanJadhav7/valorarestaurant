// frontend/app/onboarding/tenant/page.tsx
import { Suspense } from "react";
import OnboardingTenantClient from "./OnboardingTenantClient";

export default function OnboardingTenantPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1100px] px-4 py-10" />}>
      <OnboardingTenantClient />
    </Suspense>
  );
}