import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Providers } from "./providers";

function TopNavFallback() {
  return <div className="h-[56px]" />;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors duration-300">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Suspense fallback={<TopNavFallback />}>
              <TopNav />
            </Suspense>
            <main className="flex-1">{children}</main>
          </div>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 background-gradients"
          />
        </Providers>
      </body>
    </html>
  );
}
