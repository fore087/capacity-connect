import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { FeedbackTab } from "@/components/CourseFeedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — Capacity Connect admin" }] }),
  component: AdminCourses,
});

function AdminCourses() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fb, setFb] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("courses").select("*, profiles!courses_trainer_id_fkey(full_name), enrollments(count), assignments(count), assessments(count)").order("created_at", { ascending: false })).data ?? [],
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  const count = (x: unknown) => (x as { count: number }[])[0]?.count ?? 0;
  async function setStatus(id: string, status: "published" | "archived" | "draft") {
    const { error } = await supabase.from("courses").update({ status }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  }
  const rows = data.filter((c) => `${c.title} ${c.category} ${c.profiles?.full_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="All courses" description="Monitor, publish or archive courses across the platform." />
      <Input placeholder="Search courses or trainers…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No courses yet." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Course</th><th className="p-3">Trainer</th><th className="p-3">Enrolments</th><th className="p-3">Activity</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3"><Link to="/courses/$courseId" params={{ courseId: c.id }} className="font-medium text-primary hover:underline">{c.title}</Link><p className="text-xs text-muted-foreground">{c.category} · created {fmtDate(c.created_at)}</p></td>
                  <td className="p-3">{c.profiles?.full_name}</td>
                  <td className="p-3">{count(c.enrollments)}</td>
                  <td className="p-3 text-xs">{count(c.assignments)} assignments · {count(c.assessments)} assessments</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">
                    {c.status !== "published" && <Button size="sm" onClick={() => setStatus(c.id, "published")}>Publish</Button>}
                    {c.status !== "archived" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "archived")}>Archive</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setFb(c.id)}>Feedback</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!fb} onOpenChange={(o) => !o && setFb(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Course feedback</DialogTitle></DialogHeader>{fb && <FeedbackTab courseId={fb} />}</DialogContent>
      </Dialog>
    </div>
  );
}
