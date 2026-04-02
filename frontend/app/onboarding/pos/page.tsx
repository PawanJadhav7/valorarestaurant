//frontend/app/onboarding/pos/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
      {children}
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

function SourceCard({
  title,
  subtitle,
  active = false,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition",
        active
          ? "border-foreground/20 bg-background/35"
          : "border-border/50 bg-background/20",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        </div>

        {active ? (
          <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-foreground/80">
            Active
          </span>
        ) : disabled ? (
          <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            Soon
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function POSPage() {
  const router = useRouter();

  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setErr("Only CSV files are supported.");
      return;
    }

    setErr(null);
    setSuccess(null);
    setFile(f);
  }

  async function upload() {
    if (!file) {
      setErr("Please upload a CSV file.");
      return;
    }

    setLoading(true);
    setErr(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", "csv");
      formData.append("mode", "manual");

      const res = await fetch("/api/onboarding/pos", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
      }

      if (!res.ok || !data.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.error?.message === "string"
            ? data.error.message
            : typeof data?.detail === "string"
            ? data.detail
            : typeof data?.detail?.message === "string"
            ? data.detail.message
            : typeof data?.message === "string"
            ? data.message
            : `Upload failed (${res.status})`;

        console.warn("POS upload error response:", data);
        throw new Error(message);
      }

      setSuccess(
        `Uploaded ${data.rows_processed || data.rows || 0} rows successfully. Redirecting to dashboard...`
      );

      setTimeout(() => {
        router.push(data.redirect || "/restaurant");
      }, 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <OnboardingStepHeader
        currentStep="pos"
        title="Connect your operating data"
        subtitle="Upload CSV now, then expand to Square, Toast, or Clover later."
        backHref="/subscription"
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            POS onboarding
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Upload your CSV data
          </div>

          <div className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Start with CSV upload for now. Square, Toast, and Clover integration paths are being kept ready for the next phase.
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SourceCard
              title="CSV upload"
              subtitle="Manual upload for current onboarding flow"
              active
            />
            <SourceCard
              title="Square"
              subtitle="OAuth/API ingestion path"
              disabled
            />
            <SourceCard
              title="Toast"
              subtitle="Future connector"
              disabled
            />
            <SourceCard
              title="Clover"
              subtitle="Future connector"
              disabled
            />
          </div>

          {err ? (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          ) : null}

          {success ? (
            <FormMessage className="mt-5" type="success">
              {success}
            </FormMessage>
          ) : null}

          <div
            className={[
              "mt-6 flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed text-center transition",
              "border-border/60 bg-background/20 backdrop-blur-xl",
              dragActive ? "border-foreground/40 bg-background/30" : "",
            ].join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFile(e.dataTransfer.files?.[0] || null);
            }}
          >
            <div className="text-sm font-medium text-foreground">
              Drag and drop your CSV file here
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              or choose a file manually
            </div>

            <input
              type="file"
              accept=".csv"
              className="mt-4 block text-xs text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border/60 file:bg-background/40 file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />

            {file ? (
              <div className="mt-4 rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs text-foreground">
                {file.name}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/subscription")}
              disabled={loading}
            >
              Back
            </Button>

            <Button
              variant="primary"
              type="button"
              onClick={upload}
              disabled={loading}
              loading={loading}
              className="h-12 flex-1"
            >
              {loading ? "Processing..." : "Upload & continue"}
            </Button>
          </div>
        </GlassCardGlow>

        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <ValuePill>CSV first</ValuePill>
            <ValuePill>Validation step</ValuePill>
            <ValuePill>Dashboard unlock</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            What happens after upload
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Your CSV is sent through the backend ingestion path, validated, and prepared for dashboard use. Once the upload succeeds, the workspace can move into the main restaurant dashboard flow.
          </div>

          <div className="mt-6 space-y-3">
            <InfoCard
              title="Upload"
              text="Send CSV data through the onboarding ingestion path."
            />
            <InfoCard
              title="Validation"
              text="Check file shape, row count, and readiness for downstream analytics."
            />
            <InfoCard
              title="Dashboard entry"
              text="Once the upload succeeds, the workflow redirects into the restaurant dashboard."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}