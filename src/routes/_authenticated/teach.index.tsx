import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CourseFields, SubmitRow, readCourseForm } from "@/components/CourseForm";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/teach/")({
  head: () => ({ meta: [{ title: "My courses — Capacity Connect" }] }),
  component: TeachIndex,
});

function TeachIndex() {
  const { session, isApprovedTrainer, role } = useAuth();
  const uid = session!.user.id;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-courses", uid],
    queryFn: async () => (await supabase.from("courses").select("*, enrollments(count), course_modules(count)").eq("trainer_id", uid).order("created_at", { ascending: false })).data ?? [],
  });

  if (role !== "trainer") return <EmptyState title="This area is for trainers." />;

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = readCourseForm(e.currentTarget);
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message); return; }
    setBusy(true);
    const { data: c, error } = await supabase.from("courses").insert({ ...parsed.data, trainer_id: uid }).select("id").single();
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Course created as a draft");
    navigate({ to: "/teach/$courseId", params: { courseId: c.id } });
  }

  const rows = data.filter((c) => `${c.title} ${c.category}`.toLowerCase().includes(q.toLowerCase()));
  const count = (x: unknown) => (x as { count: number }[])[0]?.count ?? 0;

  return (
    <div>
      <PageHeader title="My courses" description="Create and manage your courses." actions={isApprovedTrainer ? <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New course</Button> : undefined} />
      {!isApprovedTrainer && <div className="mb-6 rounded-xl border bg-secondary p-4 text-sm">Course creation unlocks once an administrator approves your trainer account.</div>}
      <Input placeholder="Search your courses…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 md:max-w-sm" />
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No courses yet." description={isApprovedTrainer ? "Create your first course to get started." : undefined} /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.id} to="/teach/$courseId" params={{ courseId: c.id }} className="rounded-xl border bg-card p-5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold uppercase text-primary">{c.category}</p><StatusBadge status={c.status} /></div>
              <h2 className="mt-2 font-semibold">{c.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{count(c.course_modules)} modules · {count(c.enrollments)} trainees</p>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Create course</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4"><CourseFields /><SubmitRow busy={busy} label="Create course" /></form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
