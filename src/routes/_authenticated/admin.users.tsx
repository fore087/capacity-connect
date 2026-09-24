import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/users")({
  validateSearch: z.object({ filter: z.string().optional() }),
  head: () => ({ meta: [{ title: "Users — Capacity Connect" }] }),
  component: Users,
});

function Users() {
  const { role, session } = useAuth();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(search.filter ?? "all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false })).data ?? [],
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  const reload = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function update(id: string, patch: { trainer_status?: "approved" | "rejected" | "suspended" | "pending"; account_status?: "active" | "suspended" }) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("User updated"); reload();
  }
  async function setRole(id: string, current: string[], r: "trainee" | "trainer") {
    if (id === session!.user.id) { toast.error("You cannot change your own role"); return; }
    const other = r === "trainee" ? "trainer" : "trainee";
    if (current.includes(other)) await supabase.from("user_roles").delete().eq("user_id", id).eq("role", other);
    const { error } = await supabase.from("user_roles").insert({ user_id: id, role: r });
    if (error && error.code !== "23505") { toast.error(errMsg(error)); return; }
    if (r === "trainer") await supabase.from("profiles").update({ trainer_status: "pending" }).eq("id", id);
    toast.success("Role changed"); reload();
  }

  const rows = data.filter((u) => {
    const roles = (u.user_roles ?? []).map((r) => r.role as string);
    const okF = filter === "all" || (filter === "pending" ? u.trainer_status === "pending" : filter === "suspended" ? u.account_status === "suspended" : roles.includes(filter));
    return okF && `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="User management" description="Approve trainers, suspend or activate accounts and manage roles." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {["all", "trainee", "trainer", "admin", "pending", "suspended"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No users found." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Registered</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const roles = (u.user_roles ?? []).map((r) => r.role as string);
                const isTrainer = roles.includes("trainer");
                return (
                  <tr key={u.id} className="border-t align-top">
                    <td className="p-3"><p className="font-medium">{u.full_name}</p><p className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p></td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{roles.map((r) => <StatusBadge key={r} status={r} />)}</div></td>
                    <td className="p-3"><div className="flex flex-wrap gap-1"><StatusBadge status={u.account_status} />{isTrainer && <StatusBadge status={u.trainer_status} />}</div></td>
                    <td className="p-3">{fmtDate(u.created_at)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {isTrainer && u.trainer_status !== "approved" && <Button size="sm" onClick={() => update(u.id, { trainer_status: "approved" })}>Approve</Button>}
                        {isTrainer && u.trainer_status === "pending" && <Button size="sm" variant="outline" onClick={() => update(u.id, { trainer_status: "rejected" })}>Reject</Button>}
                        {isTrainer && u.trainer_status === "approved" && <Button size="sm" variant="outline" onClick={() => update(u.id, { trainer_status: "suspended" })}>Suspend trainer</Button>}
                        {u.id !== session!.user.id && (u.account_status === "active"
                          ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => update(u.id, { account_status: "suspended" })}>Suspend account</Button>
                          : <Button size="sm" variant="ghost" onClick={() => update(u.id, { account_status: "active" })}>Activate</Button>)}
                        {!roles.includes("admin") && u.id !== session!.user.id && (
                          isTrainer ? <Button size="sm" variant="ghost" onClick={() => setRole(u.id, roles, "trainee")}>Make trainee</Button>
                            : <Button size="sm" variant="ghost" onClick={() => setRole(u.id, roles, "trainer")}>Make trainer</Button>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
