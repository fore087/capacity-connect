import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatusBadge, fmtDate } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/assignments/")({
  head: () => ({ meta: [{ title: "Assignments — Capacity Connect" }] }),
  component: Assignments,
});

function Assignments() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-assignments", uid],
    queryFn: async () => {
      const [{ data: enr }, { data: subs }] = await Promise.all([
        supabase.from("enrollments").select("course_id").eq("trainee_id", uid),
        supabase.from("assignment_submissions").select("assignment_id,status,marks").eq("trainee_id", uid),
      ]);
      const ids = (enr ?? []).map((e) => e.course_id);
      if (!ids.length) return [];
      const { data: asg } = await supabase.from("assignments").select("*, courses(title)").in("course_id", ids).order("deadline");
      const map = new Map((subs ?? []).map((s) => [s.assignment_id, s]));
      return (asg ?? []).map((a) => ({ ...a, sub: map.get(a.id), st: map.get(a.id)?.status ?? "not_started" }));
    },
  });
  const rows = data.filter((a) => (status === "all" || a.st === status) && `${a.title} ${a.courses?.title}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Assignments" description="Assignments from all your enrolled courses." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <Input placeholder="Search assignments…" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "not_started", "in_progress", "submitted", "late", "evaluated"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No assignments found." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Assignment</th><th className="p-3">Course</th><th className="p-3">Deadline</th><th className="p-3">Marks</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3"><Link to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="font-medium text-primary hover:underline">{a.title}</Link></td>
                  <td className="p-3">{a.courses?.title}</td>
                  <td className="p-3">{fmtDate(a.deadline, true)}</td>
                  <td className="p-3">{a.sub?.marks != null ? `${a.sub.marks}/${a.max_marks}` : `— /${a.max_marks}`}</td>
                  <td className="p-3"><StatusBadge status={a.st} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
