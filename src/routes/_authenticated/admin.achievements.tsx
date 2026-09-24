import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Capacity Connect admin" }] }),
  component: Achievements,
});

function Achievements() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-achievements"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("achievements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-achievements"] });
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 3) { toast.error("Title is required"); return; }
    const { error } = await supabase.from("achievements").insert({
      title: title.slice(0, 200), description: String(f.get("description") ?? "").slice(0, 3000),
      achieved_on: String(f.get("achieved_on") || "") || null, published: f.get("published") === "on",
    });
    if (error) { toast.error(errMsg(error)); return; }
    form.reset(); reload();
  }
  async function toggle(id: string, published: boolean) { await supabase.from("achievements").update({ published: !published }).eq("id", id); reload(); }
  async function remove(id: string) { if (confirm("Delete?")) { await supabase.from("achievements").delete().eq("id", id); reload(); } }
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-5"><PageHeader title="Organisational achievements" description="Published achievements appear on the homepage." /></div>
      <form onSubmit={create} className="space-y-3 rounded-xl border bg-card p-5 lg:col-span-2">
        <div className="space-y-1"><Label>Title</Label><Input name="title" required /></div>
        <div className="space-y-1"><Label>Description</Label><Textarea name="description" rows={4} /></div>
        <div className="space-y-1"><Label>Date achieved</Label><Input name="achieved_on" type="date" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked /> Publish on homepage</label>
        <Button>Save achievement</Button>
      </form>
      <div className="space-y-3 lg:col-span-3">
        {data.length === 0 ? <EmptyState title="No achievements yet." /> : data.map((a) => (
          <div key={a.id} className="flex items-start gap-2 rounded-xl border bg-card p-4">
            <div className="flex-1"><p className="font-semibold">{a.title}</p><p className="text-sm text-muted-foreground">{a.description}</p><p className="text-xs text-muted-foreground">{fmtDate(a.achieved_on)}</p></div>
            <StatusBadge status={a.published ? "published" : "draft"} />
            <Button size="sm" variant="outline" onClick={() => toggle(a.id, a.published)}>{a.published ? "Hide" : "Publish"}</Button>
            <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
