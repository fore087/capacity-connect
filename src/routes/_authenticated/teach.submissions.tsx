import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fileName, openFile } from "@/lib/files";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/teach/submissions")({
  head: () => ({ meta: [{ title: "Submissions — Capacity Connect" }] }),
  component: Submissions,
});

function Submissions() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["trainer-submissions", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*, profiles!assignment_submissions_trainee_id_fkey(full_name,email), assignments!inner(title,max_marks,deadline,course_id, courses!inner(title,trainer_id))")
        .eq("assignments.courses.trainer_id", uid)
        .neq("status", "in_progress")
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });
  const rows = data.filter(
    (s) =>
      (status === "all" || (status === "pending" ? s.status === "submitted" || s.status === "late" : s.status === status)) &&
      `${s.profiles?.full_name} ${s.assignments?.title} ${s.assignments?.courses?.title}`.toLowerCase().includes(q.toLowerCase()),
  );
  const current = data.find((s) => s.id === sel);

  async function evaluate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const f = new FormData(e.currentTarget);
    const marks = Number(f.get("marks"));
    const max = current.assignments!.max_marks;
    if (Number.isNaN(marks) || marks < 0 || marks > max) { toast.error(`Marks must be between 0 and ${max}`); return; }
    const { error } = await supabase.from("assignment_submissions").update({ marks, feedback: String(f.get("feedback") ?? "").slice(0, 4000) }).eq("id", current.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Evaluation saved — the trainee has been notified");
    setSel(null);
    qc.invalidateQueries({ queryKey: ["trainer-submissions"] });
    qc.invalidateQueries({ queryKey: ["trainer-stats"] });
  }

  return (
    <div>
      <PageHeader title="Assignment submissions" description="Review, mark and give feedback on trainee work." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <Input placeholder="Search by trainee, assignment or course…" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">To evaluate</SelectItem><SelectItem value="late">Late</SelectItem>
            <SelectItem value="evaluated">Evaluated</SelectItem><SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No submissions here." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Trainee</th><th className="p-3">Assignment</th><th className="p-3">Submitted</th><th className="p-3">Marks</th><th className="p-3">Status</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3"><p className="font-medium">{s.profiles?.full_name}</p><p className="text-xs text-muted-foreground">{s.profiles?.email}</p></td>
                  <td className="p-3"><p>{s.assignments?.title}</p><p className="text-xs text-muted-foreground">{s.assignments?.courses?.title}</p></td>
                  <td className="p-3">{fmtDate(s.submitted_at, true)}</td>
                  <td className="p-3">{s.marks != null ? `${Number(s.marks)}/${s.assignments?.max_marks}` : "—"}</td>
                  <td className="p-3"><StatusBadge status={s.status} /></td>
                  <td className="p-3 text-right"><Button size="sm" variant={s.status === "evaluated" ? "outline" : "default"} onClick={() => setSel(s.id)}>{s.status === "evaluated" ? "View" : "Evaluate"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!current} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{current?.assignments?.title} — {current?.profiles?.full_name}</DialogTitle></DialogHeader>
          {current && (
            <form onSubmit={evaluate} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>Submitted {fmtDate(current.submitted_at, true)} {current.status === "late" && <StatusBadge status="late" />}</p>
                {current.file_path && <Button type="button" variant="link" className="h-auto p-0" onClick={() => openFile("submissions", current.file_path!).catch((e) => toast.error(errMsg(e)))}>Download: {fileName(current.file_path)}</Button>}
                {current.comments && <p className="mt-2 whitespace-pre-wrap">{current.comments}</p>}
              </div>
              <div className="space-y-2"><Label>Marks (out of {current.assignments?.max_marks})</Label><Input name="marks" type="number" step="0.5" min={0} max={current.assignments?.max_marks} defaultValue={current.marks != null ? Number(current.marks) : ""} required /></div>
              <div className="space-y-2"><Label>Feedback</Label><Textarea name="feedback" rows={5} defaultValue={current.feedback ?? ""} /></div>
              <Button>Save evaluation</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
