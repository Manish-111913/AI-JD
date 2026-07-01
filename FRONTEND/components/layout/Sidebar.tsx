"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FileText, Zap, Settings2, ListOrdered,
  BarChart3, Cpu, Download, Sun, Moon, Users, ChevronRight,
  Key, MessageSquare, Sparkles
} from "lucide-react";
import { useAppContext } from "@/store/appStore";

const NAV = [
  { section: "Overview", items: [
    { href: "/home", icon: LayoutDashboard, label: "Home" },
    { href: "/jd", icon: FileText, label: "Job Description" },
  ]},
  { section: "Pipeline", items: [
    { href: "/input", icon: Zap, label: "Run Ranking" },
    { href: "/config", icon: Settings2, label: "Configuration" },
  ]},
  { section: "Output", items: [
    { href: "/results", icon: ListOrdered, label: "Results" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/ce-inspector", icon: Cpu, label: "CE Inspector" },
  ]},
  { section: "AI Mode", items: [
    { href: "/api-settings", icon: Key, label: "API Settings" },
    { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  ]},
];

const STATUS_CONFIG = {
  idle:    { label: "Ready",             dot: "bg-emerald-500" },
  loading: { label: "Loading…",          dot: "bg-amber-400 animate-pulse" },
  ranking: { label: "Ranking in Progress", dot: "bg-amber-400 animate-pulse" },
  done:    { label: "Results Ready",     dot: "bg-emerald-500" },
  error:   { label: "Error",             dot: "bg-red-500" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { state, dispatch } = useAppContext();
  const statusInfo = STATUS_CONFIG[state.status];

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && pathname.startsWith(href));

  return (
    <aside
      className="
        fixed top-0 left-0 h-full z-40
        w-[220px] flex flex-col
        border-r border-border
        bg-sidebar glass-sidebar
      "
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-6 h-6 rounded-[6px] bg-foreground flex items-center justify-center flex-shrink-0">
          <Cpu className="w-3.5 h-3.5 text-background" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight text-foreground leading-none">Redrob AI</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Candidate Ranker</div>
        </div>
      </div>

      {/* Status */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusInfo.dot}`} />
          <span className="text-[11px] font-medium text-sidebar-foreground truncate">{statusInfo.label}</span>
          {state.candidatesData.length > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <Users className="w-2.5 h-2.5" />
              {state.candidatesData.length}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map((section) => (
          <div key={section.section} className="mb-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
              {section.section}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px]
                    text-[13px] font-medium transition-all duration-100 mb-0.5
                    ${active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }
                  `}
                >
                  <motion.span whileTap={{ scale: 0.98 }} className="flex items-center gap-2.5 w-full">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-background" : "text-muted-foreground"}`} />
                    <span className="truncate">{item.label}</span>
                    {active && item.href === "/results" && state.rankingResults.length > 0 && (
                      <span className="ml-auto text-[10px] font-mono opacity-60">{state.rankingResults.length}</span>
                    )}
                  </motion.span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border">
        {/* Mode badge */}
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border ${
            state.apiSettings?.apiModeEnabled
              ? 'border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 flex items-center gap-0.5'
              : state.executionMode === 'competition'
                ? 'border-border text-muted-foreground bg-muted/50'
                : 'border-ai/30 text-ai bg-ai/8'
          }`}>
            {state.apiSettings?.apiModeEnabled ? (
              <><Sparkles className="w-2.5 h-2.5" /> API Mode</>
            ) : state.executionMode === 'competition' ? 'Competition' : 'Demo'}
          </span>
          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground">Mode</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => dispatch({ type: "SET_THEME", payload: state.theme === "light" ? "dark" : "light" })}
          className="
            w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px]
            text-[12px] text-muted-foreground
            hover:bg-sidebar-accent hover:text-sidebar-foreground
            transition-colors
          "
        >
          {state.theme === "light"
            ? <><Moon className="w-3.5 h-3.5" /> Dark Mode</>
            : <><Sun className="w-3.5 h-3.5" /> Light Mode</>
          }
        </button>
      </div>
    </aside>
  );
}
