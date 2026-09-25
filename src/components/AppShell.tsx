import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award, Bell, BookOpen, ClipboardCheck, FileText, LayoutDashboard, LogOut, Megaphone, Menu,
  Network, Trophy, User, Users, Library, GraduationCap, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: ReactNode };

const NAV: Record<Role, NavItem[]> = {
  trainee: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/courses", label: "Browse courses", icon: <Library className="h-4 w-4" /> },
    { to: "/learn", label: "My learning", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
    { to: "/assessments", label: "Assessments", icon: <ClipboardCheck className="h-4 w-4" /> },
    { to: "/certificates", label: "Certificates", icon: <Award className="h-4 w-4" /> },
    { to: "/profile", label: "My profile", icon: <User className="h-4 w-4" /> },
  ],
  trainer: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/teach", label: "My courses", icon: <GraduationCap className="h-4 w-4" /> },
    { to: "/teach/submissions", label: "Submissions", icon: <FileText className="h-4 w-4" /> },
    { to: "/courses", label: "Course catalogue", icon: <Library className="h-4 w-4" /> },
    { to: "/profile", label: "Profile & skills", icon: <User className="h-4 w-4" /> },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { to: "/admin/courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/admin/monitoring", label: "Monitoring", icon: <ClipboardCheck className="h-4 w-4" /> },
    { to: "/admin/competencies", label: "Competency matching", icon: <Network className="h-4 w-4" /> },
    { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
    { to: "/admin/achievements", label: "Achievements", icon: <Trophy className="h-4 w-4" /> },
    { to: "/profile", label: "My profile", icon: <User className="h-4 w-4" /> },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { role, profile, signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-count", session?.user.id],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  const items = role ? NAV[role] : [];

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo light />
        <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
        {role ?? ""} portal
      </p>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            onClick={() => setOpen(false)}
            activeOptions={{ exact: it.to === "/dashboard" || it.to === "/teach" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
          >
            {it.icon}
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm italic text-muted-foreground md:block">
            Build Skills. Build Capacity. Build the Future.
          </p>
          <Link to="/notifications" className="relative rounded-full p-2 hover:bg-muted" aria-label="Notifications">
            <Bell className="h-5 w-5 text-foreground" />
            {unread > 0 && (
              <span className={cn("absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground")}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
