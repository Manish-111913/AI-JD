"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Download, Users, ChevronRight, Zap } from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { exportToCsv } from "@/utils/csvExport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/app", label: "Input" },
  { href: "/results", label: "Results" },
  { href: "/analytics", label: "Analytics" },
  { href: "/llm-inspector", label: "LLM Inspector" },
  { href: "/about", label: "About" },
];

export default function NavBar({ isLanding = false }: { isLanding?: boolean }) {
  const pathname = usePathname();
  const { state } = useAppContext();

  const statusConfig = {
    idle: { label: "IDLE", className: "bg-muted text-muted-foreground" },
    loading: { label: "LOADING", className: "bg-primary/20 text-primary animate-pulse" },
    ranking: { label: "RANKING", className: "bg-amber-500/20 text-amber-400 animate-pulse" },
    done: { label: "RESULTS READY", className: "bg-accent/20 text-accent" },
    error: { label: "ERROR", className: "bg-destructive/20 text-destructive" },
  };

  const status = statusConfig[state.status];

  function handleExport() {
    if (state.rankingResults.length > 0) {
      exportToCsv(state.rankingResults);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-sidebar/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 px-4 h-14">
        {/* Brand */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="nav-brand">
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight whitespace-nowrap">Redrob AI Ranker</span>
          </div>
        </Link>

        <ChevronRight className="w-3 h-3 text-muted-foreground hidden sm:block" />

        {/* Status badge */}
        <Badge
          className={`text-xs font-mono px-2 py-0.5 rounded-sm border-0 ${status.className}`}
          data-testid="status-badge"
        >
          {status.label}
        </Badge>

        {/* Candidate count */}
        {state.candidatesData.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="candidate-count">
            <Users className="w-3 h-3" />
            <span>{state.candidatesData.length} candidates</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CSV Export button */}
        {state.status === "done" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
            onClick={handleExport}
            data-testid="button-download-csv"
          >
            <Download className="w-3 h-3" />
            Download CSV
          </Button>
        )}
      </div>
    </header>
  );
}
