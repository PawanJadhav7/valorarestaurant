import type { Session } from "./types";

export function nextRouteForSession(s: Session): string {
  if (!s?.ok) return "/login";

  if (s.subscriptionStatus !== "active") return "/signup";
  if (s.onboardingStatus !== "done") return "/onboarding";

  return "/restaurant";
}