import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LEVELS, computeMatch, levelName } from "@/lib/competency";
import { EmptyState, PageHeader, errMsg } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/admin/competencies")({
  head: () => ({ meta: [{ title: "Competency Matching Engine — Capacity Connect" }] }),
  component: Competencies,
});

const sel = "h-9 rounded-md border bg-transparent px-3 text-sm";

function Competencies() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const { data } = useQuery({
    queryKey: ["cme"],
    enabled: role === "admin",
    queryFn: async () => {
      const [s, c, r, tc, tr, ta] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("competencies").select("*").order("name"),
        supabase.from("subject_requirements").select("*, competencies(name)"),
        supabase.from("trainer_competencies").select("*"),
        supabase.from("profiles").select("id, full_name, trainer_status, user_roles!inner(role)").eq("user_roles.role", "trainer"),
        supabase.from("trainer_assignments").select("*"),
      ]);
      return { subjects: s.data ?? [], comps: c.data ?? [], reqs: r.data ?? [], tcs: tc.data ?? [], trainers: tr.data ?? [], assigns: ta.data ?? [] };
    },
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  if (!data) return null;
  const reload = () => qc.invalidateQueries({ queryKey: ["cme"] });
  const run = async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; if (error) toast.error(errMsg(error)); reload(); };

  const cur = subject || data.subjects[0]?.id || "";
  const reqs = data.reqs.filter((r) => r.subject_id === cur).map((r) => ({ competency_id: r.competency_id, competency: r.competencies?.name ?? "", required_level: r.required_level, id: r.id }));
  const results = data.trainers.map((t) => {
    const levels = new Map(data.tcs.filter((x) => x.trainer_id === t.id).map((x) => [x.competency_id, x.level]));
    return { t, ...computeMatch(reqs, levels), assigned: data.assigns.find((a) => a.trainer_id === t.id && a.subject_id === cur) };
  }).sort((a, b) => b.percent - a.percent);

  return (
    <div className="space-y-6">
      <PageHeader title="Competency Matching Engine" description="Rule-based: each requirement scores min(trainer level ÷ required level, 1); the overall match is the average." />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Subjects</h2>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("n") ?? "").trim(); if (n) run(supabase.from("subjects").insert({ name: n.slice(0, 120) })); e.currentTarget.reset(); }}>
            <Input name="n" placeholder="e.g. Artificial Intelligence" /><Button>Add</Button>
          </form>
          <ul className="mt-3 divide-y text-sm">{data.subjects.map((s) => <li key={s.id} className="flex justify-between py-2">{s.name}<button onClick={() => confirm("Delete subject?") && run(supabase.from("subjects").delete().eq("id", s.id))}><Trash2 className="h-4 w-4" /></button></li>)}</ul>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Competencies</h2>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("n") ?? "").trim(); if (n) run(supabase.from("competencies").insert({ name: n.slice(0, 120) })); e.currentTarget.reset(); }}>
            <Input name="n" placeholder="e.g. Python" /><Button>Add</Button>
          </form>
          <ul className="mt-3 divide-y text-sm">{data.comps.map((c) => <li key={c.id} className="flex justify-between py-2">{c.name}<button onClick={() => confirm("Delete competency?") && run(supabase.from("competencies").delete().eq("id", c.id))}><Trash2 className="h-4 w-4" /></button></li>)}</ul>
        </section>
      </div>
      {data.subjects.length === 0 ? <EmptyState title="Add a subject to start matching." /> : (
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Requirements for</h2>
            <select className={sel} value={cur} onChange={(e) => setSubject(e.target.value)}>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from("subject_requirements").upsert({ subject_id: cur, competency_id: String(f.get("c")), required_level: Number(f.get("l")) }, { onConflict: "subject_id,competency_id" })); }}>
            <select name="c" className={sel}>{data.comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select name="l" className={sel} defaultValue="3">{[1, 2, 3, 4].map((l) => <option key={l} value={l}>{LEVELS[l]}</option>)}</select>
            <Button disabled={!data.comps.length}>Add requirement</Button>
          </form>
          <ul className="mt-3 flex flex-wrap gap-2">{reqs.map((r) => <li key={r.id} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm">{r.competency} — {levelName(r.required_level)}<button onClick={() => run(supabase.from("subject_requirements").delete().eq("id", r.id))}><Trash2 className="h-3 w-3" /></button></li>)}</ul>

          <h2 className="mb-3 mt-8 font-semibold">Trainer matches</h2>
          {reqs.length === 0 ? <p className="text-sm text-muted-foreground">Add requirements to calculate matches.</p> : results.length === 0 ? <EmptyState title="No trainers registered yet." /> : (
            <div className="space-y-4">
              {results.map((r) => (
                <div key={r.t.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 font-semibold">{r.t.full_name} <span className="text-xs font-normal capitalize text-muted-foreground">({r.t.trainer_status})</span></p>
                    <span className="font-display text-xl font-bold">{r.percent}%</span>
                    {r.assigned ? <Button size="sm" variant="outline" onClick={() => run(supabase.from("trainer_assignments").delete().eq("id", r.assigned!.id))}>Unassign</Button>
                      : <Button size="sm" onClick={() => run(supabase.from("trainer_assignments").insert({ subject_id: cur, trainer_id: r.t.id, assigned_by: session!.user.id, match_score: r.percent }))}>Assign to subject</Button>}
                  </div>
                  <Progress value={r.percent} className="my-2" />
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground"><tr><th>Competency</th><th>Required</th><th>Trainer</th><th>Result</th></tr></thead>
                    <tbody>{r.rows.map((row) => (
                      <tr key={row.competency}><td>{row.competency}</td><td>{levelName(row.required_level)}</td><td>{levelName(row.trainer_level)}</td>
                        <td>{row.match ? <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Match</span> : <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Gap</span>}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
