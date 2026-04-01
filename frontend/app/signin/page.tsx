import SignInClient from "./signin-client";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  return <SignInClient searchParams={resolvedSearchParams} />;
}