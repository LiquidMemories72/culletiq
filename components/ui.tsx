import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  SearchCheck,
  type LucideIcon,
} from "lucide-react";
import type { AssessmentStatus, FindingSeverity, IndicatorStatus, ReliabilityTier } from "@/types/analysis";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2";
const BUTTON_VARIANTS = {
  primary: "bg-accent px-4 py-2.5 text-white hover:bg-accent-strong",
  secondary: "border border-line-strong bg-surface px-4 py-2.5 text-ink hover:bg-surface-2",
  ghost: "px-3 py-2 text-ink-2 hover:bg-surface-2",
  danger: "border border-line-strong bg-surface px-4 py-2.5 text-blocking hover:bg-blocking-soft",
};
export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = "secondary",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button type="button" className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)} {...rest} />;
}

export function LinkButton({
  variant = "secondary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)} {...rest} />;
}

const TONES = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  good: "bg-good-soft text-good border-good/25",
  caution: "bg-caution-soft text-caution border-caution/25",
  action: "bg-action-soft text-action border-action/25",
  blocking: "bg-blocking-soft text-blocking border-blocking/25",
  accent: "bg-accent-soft text-accent-strong border-accent/25",
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}

const STATUS_META: Record<AssessmentStatus, { tone: Tone; icon: LucideIcon; label: string }> = {
  assessable: { tone: "good", icon: CheckCircle2, label: "Assessable" },
  inspect: { tone: "action", icon: SearchCheck, label: "Inspect" },
  unsuitable: { tone: "blocking", icon: AlertOctagon, label: "Unsuitable image" },
};

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

const TIER_META: Record<ReliabilityTier, { tone: Tone; label: string }> = {
  higher: { tone: "good", label: "Higher" },
  moderate: { tone: "caution", label: "Moderate" },
  low: { tone: "action", label: "Low" },
  unsuitable: { tone: "blocking", label: "Unsuitable" },
};

export function TierBadge({ tier, prefix = "Image reliability" }: { tier: ReliabilityTier; prefix?: string }) {
  const m = TIER_META[tier];
  return (
    <Badge tone={m.tone}>
      {prefix}: {m.label}
    </Badge>
  );
}

export const SEVERITY_META: Record<FindingSeverity, { tone: Tone; icon: LucideIcon; label: string }> = {
  info: { tone: "neutral", icon: Info, label: "Info" },
  caution: { tone: "caution", icon: AlertTriangle, label: "Caution" },
  action: { tone: "action", icon: SearchCheck, label: "Action" },
  blocking: { tone: "blocking", icon: AlertOctagon, label: "Blocking" },
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const m = SEVERITY_META[severity];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export const INDICATOR_META: Record<IndicatorStatus, { tone: Tone; icon: LucideIcon; label: string }> = {
  good: { tone: "good", icon: CheckCircle2, label: "Good" },
  caution: { tone: "caution", icon: AlertTriangle, label: "Caution" },
  poor: { tone: "blocking", icon: AlertOctagon, label: "Poor" },
};

export function Notice({
  tone = "neutral",
  icon: Icon = Info,
  title,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex gap-3 rounded-lg border px-4 py-3 text-sm", TONES[tone], className)} role="note">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-ink-2">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-surface-2 p-3 text-muted">
        <Icon aria-hidden className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Native details/summary disclosure — keyboard accessible without JS. */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cx("group rounded-lg border border-line bg-surface", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-3 text-sm text-ink-2">{children}</div>
    </details>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function pct(v: number, d = 1) {
  return `${v.toFixed(d)}%`;
}
