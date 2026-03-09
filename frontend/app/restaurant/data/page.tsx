// app/restaurant/data/page.tsx
import { Suspense } from "react";
import DataClient from "./DataClient";

export default function DataPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1400px] px-4 py-6" />}>
      <DataClient />
    </Suspense>
  );
}