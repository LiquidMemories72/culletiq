"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, BookOpen, Cpu, Gauge, GitCompareArrows, History, LayoutDashboard, Menu, ScanSearch, Smartphone, X } from "lucide-react";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Start here", icon: LayoutDashboard },
  { href: "/insights", label: "Batch insights", icon: Gauge },
  { href: "/industrial", label: "Sorting studio", icon: Activity },
  { href: "/citizen", label: "Citizen guide", icon: Smartphone },
  { href: "/models", label: "Models & training", icon: Cpu },
  { href: "/analyse", label: "Analyse a batch", icon: ScanSearch },
  { href: "/samples", label: "Saved samples", icon: History },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#3e6a4f" />
        <path d="M9 21 L14 9 L19 15 Z" fill="#cfe3d4" />
        <path d="M15 23 L21 11 L25 22 Z" fill="#8fbf9d" />
        <path d="M7 24 L12 18 L16 25 Z" fill="#f1f5ef" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        Cullet<span className="text-[#9fc9ab]">IQ</span>
      </span>
    </Link>
  );
}

function NavLinks({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const isReport = path.endsWith("/report");

  if (isReport) return <>{children}</>;

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="no-print hidden w-60 shrink-0 flex-col bg-charcoal px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <Logo />
        <p className="mt-1 pl-[42px] text-[11px] text-white/45">Glass recycling intelligence</p>
        <nav aria-label="Main" className="mt-8 flex-1">
          <NavLinks path={path} />
        </nav>
        <p className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/45">
          Decision-support prototype. Image-area estimates only — not certified quality control.
        </p>
      </aside>

      <div className="no-print sticky top-0 z-30 flex items-center justify-between bg-charcoal px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 text-white/80 hover:bg-white/10"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="no-print sticky top-[60px] z-20 bg-charcoal px-4 pb-4 lg:hidden">
          <NavLinks path={path} onNavigate={() => setOpen(false)} />
        </nav>
      )}

      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
