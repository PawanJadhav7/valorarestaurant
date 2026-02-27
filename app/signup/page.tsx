// app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1100px] px-4 py-10" />}>
      <SignupClient />
    </Suspense>
  );
}