import { Link } from "@tanstack/react-router";
import { LineChart, Database, BrainCircuit } from "lucide-react";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "Dashboard", icon: LineChart },
  { to: "/datos", label: "Datos financieros", icon: Database },
  { to: "/modelos", label: "Modelos ML / DL", icon: BrainCircuit },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Fin<span className="text-gradient-brand">Lab</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
