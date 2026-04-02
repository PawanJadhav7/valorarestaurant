"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Button from "@/components/ui/Button";

type StepItem = {
  number: number;
  key: string;
  label: string;
};

const STEPS: StepItem[] = [
  { number: 1, key: "profile", label: "Profile" },
  { number: 2, key: "tenant", label: "Tenant" },
  { number: 3, key: "subscription", label: "Subscription" },
  { number: 4, key: "pos", label: "POS" },
  { number: 5, key: "dashboard", label: "Dashboard" },
];

interface OnboardingStepHeaderProps {
  currentStep: "profile" | "tenant" | "subscription" | "pos" | "dashboard";
  title: string;
  subtitle?: string;
  backHref?: string;
  className?: string;
}

function StepCircle({
  step,
  state,
}: {
  step: StepItem;
  state: "done" | "active" | "upcoming";
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {state === "active" ? (
          <div className="absolute -inset-1.5 rounded-full bg-emerald-400/75 blur-md opacity-80" />
        ) : null}

        <div
          className={clsx(
            "relative flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200",
            state === "done" &&
              "border-emerald-400/30 bg-emerald-500/8 text-foreground",
            state === "active" &&
              "border-emerald-400/60 bg-emerald-500/12 text-foreground shadow-[0_0_0_1px_rgba(74,222,128,0.22),0_0_20px_rgba(74,222,128,0.22)]",
            state === "upcoming" &&
              "border-border/40 bg-background/20 text-muted-foreground"
          )}
        >
          {step.number}
        </div>
      </div>

      <div className="hidden sm:block">
        <div
          className={clsx(
            "text-xs font-medium uppercase tracking-wide",
            state === "active"
              ? "text-foreground"
              : state === "done"
              ? "text-foreground/80"
              : "text-muted-foreground"
          )}
        >
          Step {step.number}
        </div>
        <div
          className={clsx(
            "text-sm font-semibold",
            state === "active"
              ? "text-foreground"
              : state === "done"
              ? "text-foreground/85"
              : "text-muted-foreground"
          )}
        >
          {step.label}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStepHeader({
  currentStep,
  title,
  subtitle,
  backHref,
  className,
}: OnboardingStepHeaderProps) {
  const router = useRouter();

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className={clsx("mb-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {subtitle}
            </div>
          ) : null}
        </div>

        {backHref ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(backHref)}
            className="shrink-0"
          >
            ← Back
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-3 rounded-2xl border border-border/50 bg-background/20 p-4 backdrop-blur-xl lg:justify-between">
          {STEPS.map((step, idx) => {
            const state: "done" | "active" | "upcoming" =
              idx < currentIndex
                ? "done"
                : idx === currentIndex
                ? "active"
                : "upcoming";

            return (
              <React.Fragment key={step.key}>
                <StepCircle step={step} state={state} />
                {idx < STEPS.length - 1 ? (
                  <div className="mx-1 h-px w-8 bg-border/50 sm:w-12 lg:flex-1" />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}