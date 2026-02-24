// app/restaurant/sales/page.tsx
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default function SalesPage() {
  return <SalesClient />;
}