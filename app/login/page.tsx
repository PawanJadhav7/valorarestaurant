// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[900px] px-4 py-10" />}>
      <LoginClient />
    </Suspense>
  );
}