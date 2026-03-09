"use client";
import { MenuIntelligenceClient } from "./menu-client";

export const dynamic = "force-dynamic";

export default function MenuIntelligencePage() {
  return (
    <div className="space-y-6">
      <MenuIntelligenceClient />
    </div>
  );
}