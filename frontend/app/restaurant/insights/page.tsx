// app/restaurant/insights/page.tsx

"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantTopBar } from "@/components/restaurant/RestaurantTopBar";
// Update the path to the correct location of BackendTest
import { BackendTest } from "../BackendTest";

export default function InsightsPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold text-foreground">AI Insights</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Placeholder. Next: KPI narratives + drivers + recommended actions.
      </div>
       <div className="text-sm font-semibold text-foreground">AI Insights</div>
      <div className="mt-1 text-sm text-muted-foreground">
        <SectionCard title="Next steps" subtitle="Once CSV ingestion is stable, we turn on AI narratives + driver analysis.">
               <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                 <Card className="rounded-2xl">
                   <CardContent className="p-4">
                     <div className="text-sm font-semibold text-foreground">AI Insights</div>
                     <div className="mt-1 text-sm text-muted-foreground">
                       Convert KPI changes into “why it happened” and “what to do next” (menu, staffing, promos, waste).
                     </div>
                     <div className="mt-3">
                       <Link href="/restaurant/insights" className="text-sm font-semibold text-foreground hover:underline">
                         Open AI Insights →
                       </Link>
                     </div>
                   </CardContent>
                 </Card>
       
                 <Card className="rounded-2xl">
                   <CardContent className="p-4">
                     <div className="text-sm font-semibold text-foreground">Multi-location</div>
                     <div className="mt-1 text-sm text-muted-foreground">
                       MVP supports multi-location. Add a selector once location_id is consistently ingested.
                     </div>
                   </CardContent>
                 </Card>
       
                 <Card className="rounded-2xl">
                   <CardContent className="p-4">
                     <div className="text-sm font-semibold text-foreground">Toast integration</div>
                     <div className="mt-1 text-sm text-muted-foreground">
                       Testing connectivity to Toast’s API for real-time data sync. This is sample UI; actual integration may differ.
                     </div>
                   </CardContent>
                 </Card>
       
                 <Card className="rounded-2xl md:col-span-3">
                   <CardContent className="p-4 space-y-3">
                     <div>
                       <div className="text-sm font-semibold text-foreground">Backend connectivity (temporary)</div>
                       <div className="mt-1 text-sm text-muted-foreground">
                         Test a backend POST and visualize a response. Remove once Toast connector is real.
                       </div>
                     </div>
                     <BackendTest />
                   </CardContent>
                 </Card>
               </div>
             </SectionCard>
      </div>


      
    </div>
    
    
  );
}