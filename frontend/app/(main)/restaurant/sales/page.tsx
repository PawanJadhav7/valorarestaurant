import { Suspense } from "react";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading sales page...</div>}>
        <SalesClient />
      </Suspense>
    </div>
  );
}
