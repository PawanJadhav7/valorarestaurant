// frontend/components/restaurant/PageScaffold.tsx
import * as React from "react";

export function PageScaffold({
  header,
  kpiSection,
  charts,
  performanceInsights,
  intelligence,
  drilldown,
}: {
  header: React.ReactNode;
  kpiSection: React.ReactNode;
  charts?: React.ReactNode;
  performanceInsights?: React.ReactNode;
  intelligence?: React.ReactNode;
  drilldown?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4">
      {header}

      {kpiSection}

      {charts ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {charts}
        </div>
      ) : null}

      {performanceInsights}

      {intelligence}

      {drilldown}
    </div>
  );
}