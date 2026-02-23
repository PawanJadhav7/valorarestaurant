import type { ReactNode } from "react";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors duration-300">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <TopNav />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}