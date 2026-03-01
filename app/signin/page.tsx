// app/signin/page.tsx
import SignInClient from "./SignInClient";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const nextParam = typeof searchParams?.next === "string" ? searchParams?.next : "/restaurant";
  return <SignInClient nextParam={nextParam} />;
}