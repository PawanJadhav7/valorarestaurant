import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function TopNav() {
  return (
    <div className="glass flex items-center justify-between px-6 py-3">
      <div className="text-lg font-semibold">Valora AI</div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </div>
  );
}