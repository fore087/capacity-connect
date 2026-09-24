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

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Capacity Connect admin" }] }),
  component: Announcements,
});

function Announcements() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-announcements"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-announcements"] });

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 3) { toast.error("Title is required"); return; }
    const pub = String(f.get("publish_at") || ""), exp = String(f.get("expire_at") || "");
    if (pub && exp && new Date(exp) <= new Date(pub)) { toast.error("Expiry must be after publish date"); return; }
    const { error } = await supabase.from("announcements").insert({
      title: title.slice(0, 200), description: String(f.get("description") ?? "").slice(0, 5000), category: String(f.get("category") || "General").slice(0, 60),
      image_url: String(f.get("image_url") || "") || null, publish_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      expire_at: exp ? new Date(exp).toISOString() : null, status: String(f.get("status")) === "published" ? "published" : "draft", created_by: session!.user.id,
    });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Announcement saved"); form.reset(); reload();
  }
  async function setStatus(id: string, status: string) { await supabase.from("announcements").update({ status }).eq("id", id); reload(); }
  async function remove(id: string) { if (confirm("Delete announcement?")) { await supabase.from("announcements").delete().eq("id", id); reload(); } }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-5"><PageHeader title="Announcements" description="Published announcements appear on the homepage and notify every user." /></div>
      <form onSubmit={create} className="space-y-3 rounded-xl border bg-card p-5 lg:col-span-2">
        <div className="space-y-1"><Label>Title</Label><Input name="title" required /></div>
        <div className="space-y-1"><Label>Description</Label><Textarea name="description" rows={4} /></div>
        <div className="space-y-1"><Label>Category</Label><Input name="category" placeholder="General" /></div>
        <div className="space-y-1"><Label>Image URL (optional)</Label><Input name="image_url" type="url" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label>Publish date</Label><Input name="publish_at" type="datetime-local" /></div>
          <div className="space-y-1"><Label>Expiry date</Label><Input name="expire_at" type="datetime-local" /></div>
        </div>
        <select name="status" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="published">Publish now</option><option value="draft">Save as draft</option></select>
        <Button>Save announcement</Button>
      </form>
      <div className="space-y-3 lg:col-span-3">
        {data.length === 0 ? <EmptyState title="No announcements yet." /> : data.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{a.category} · {fmtDate(a.publish_at)}{a.expire_at ? ` → ${fmtDate(a.expire_at)}` : ""}</p></div>
              <StatusBadge status={a.status} />
              <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setStatus(a.id, a.status === "published" ? "archived" : "published")}>{a.status === "published" ? "Archive" : "Publish"}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
