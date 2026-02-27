// app/layout.tsx
// import type { ReactNode } from "react";
// import "./globals.css";
// import { TopNav } from "@/components/layout/TopNav";
// import { Providers } from "./providers";

// export default function RootLayout({ children }: { children: ReactNode }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body className="bg-background text-foreground transition-colors duration-300">
//         <Providers>
//           <div className="min-h-screen flex flex-col">
//             <TopNav />
//             <main className="flex-1">{children}</main>
//           </div>
//           <div
//             aria-hidden
//             className="pointer-events-none fixed inset-0 -z-10"
//             style={{
//               background:
//                 "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.35), transparent 45%)," +
//                 "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.25), transparent 50%)," +
//                 "radial-gradient(circle at 40% 90%, rgba(34,197,94,0.20), transparent 55%)," +
//                 "linear-gradient(180deg, rgba(0,0,0,0.04), transparent 40%)",
//             }}
//           />
//         </Providers>
//       </body>
//     </html>
//   );
// }
//----------------------------------------------------------------------------------------------------------

// app/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Providers } from "./providers";

function TopNavFallback() {
  // Keeps layout stable during suspense
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
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.35), transparent 45%)," +
                "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.25), transparent 50%)," +
                "radial-gradient(circle at 40% 90%, rgba(34,197,94,0.20), transparent 55%)," +
                "linear-gradient(180deg, rgba(0,0,0,0.04), transparent 40%)",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}