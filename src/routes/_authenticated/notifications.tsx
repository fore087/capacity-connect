import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Capacity Connect" }] }),
  component: Notifications,
});

function Notifications() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", session?.user.id],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread-count"] }); };

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false).eq("user_id", session!.user.id);
    refresh();
  }
  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    refresh();
  }
  async function remove(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" actions={data.some((n) => !n.read) ? <Button variant="outline" onClick={markAll}><Check className="mr-2 h-4 w-4" />Mark all read</Button> : undefined} />
      {isLoading ? <Loading /> : data.length === 0 ? <EmptyState title="You're all caught up." description="Notifications about enrolments, assignments, results and announcements will appear here." /> : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={cn("flex gap-3 rounded-xl border bg-card p-4", !n.read && "border-l-4 border-l-accent")}>
              <Bell className={cn("mt-0.5 h-5 w-5 shrink-0", n.read ? "text-muted-foreground" : "text-primary")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.link ? <Link to={n.link} onClick={() => markRead(n.id)} className="hover:text-primary">{n.title}</Link> : n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.created_at, true)}</p>
              </div>
              <div className="flex gap-1">
                {!n.read && <Button size="icon" variant="ghost" onClick={() => markRead(n.id)} aria-label="Mark read"><Check className="h-4 w-4" /></Button>}
                <Button size="icon" variant="ghost" onClick={() => remove(n.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
