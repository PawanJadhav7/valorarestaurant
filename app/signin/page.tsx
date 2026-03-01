// app/signin/page.tsx
import { Suspense } from "react";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10" />}>
      <SignInClient />
    </Suspense>
  );
}