import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className={cn("font-display text-lg font-bold tracking-tight", light ? "text-sidebar-foreground" : "text-foreground")}>
        Capacity<span className="text-accent">Connect</span>
      </span>
    </Link>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-foreground">{value ?? 0}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success text-success-foreground",
  approved: "bg-success text-success-foreground",
  active: "bg-success text-success-foreground",
  evaluated: "bg-success text-success-foreground",
  passed: "bg-success text-success-foreground",
  submitted: "bg-primary text-primary-foreground",
  pending: "bg-warning text-accent-foreground",
  late: "bg-warning text-accent-foreground",
  in_progress: "bg-secondary text-secondary-foreground",
  draft: "bg-muted text-muted-foreground",
  not_started: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  suspended: "bg-destructive text-destructive-foreground",
  failed: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <Badge className={cn("border-0 capitalize", STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground")}>
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

export function Loading() {
  return <div className="py-16 text-center text-muted-foreground">Loading…</div>;
}

export function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = new Date(d);
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Converts an ISO string to the value format of <input type="datetime-local"> */
export function toLocalInput(d: string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}
