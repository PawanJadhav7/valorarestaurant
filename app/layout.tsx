// app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav"; // adjust path if different

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors duration-300">
        <div className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}