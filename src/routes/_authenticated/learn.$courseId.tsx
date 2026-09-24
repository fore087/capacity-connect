import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, CheckCircle2, Circle, ExternalLink, FileDown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openFile } from "@/lib/files";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  head: () => ({ meta: [{ title: "Course — Capacity Connect" }] }),
  component: LearnCourse,
});

type Completion = {
  modules_total: number; modules_done: number; assignments_total: number; assignments_submitted: number;
  assessments_total: number; assessments_passed: number; score: number; eligible: boolean;
};

function LearnCourse() {
  const { courseId } = Route.useParams();
  const { session } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["learn", courseId, uid],
    queryFn: async () => {
      const [course, enr, mods, done, res, asg, subs, ass, atts, cert, status] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("enrollments").select("id").eq("course_id", courseId).eq("trainee_id", uid).maybeSingle(),
        supabase.from("course_modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("module_completions").select("module_id").eq("trainee_id", uid),
        supabase.from("resources").select("*").eq("course_id", courseId).order("created_at"),
        supabase.from("assignments").select("*").eq("course_id", courseId).order("deadline"),
        supabase.from("assignment_submissions").select("assignment_id,status,marks").eq("trainee_id", uid),
        supabase.from("assessments").select("*").eq("course_id", courseId).eq("published", true).order("created_at"),
        supabase.from("assessment_attempts").select("assessment_id,percentage,passed,submitted_at").eq("trainee_id", uid),
        supabase.from("certificates").select("id").eq("course_id", courseId).eq("trainee_id", uid).maybeSingle(),
        supabase.rpc("course_completion_status", { _course: courseId }),
      ]);
      return {
        course: course.data, enrolled: !!enr.data, modules: mods.data ?? [],
        done: new Set((done.data ?? []).map((d) => d.module_id)), resources: res.data ?? [],
        assignments: asg.data ?? [], subs: new Map((subs.data ?? []).map((s) => [s.assignment_id, s])),
        assessments: ass.data ?? [], attempts: new Map((atts.data ?? []).map((a) => [a.assessment_id, a])),
        certificate: cert.data, status: status.data as unknown as Completion,
      };
    },
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["learn", courseId] });

  if (isLoading || !data) return <Loading />;
  if (!data.course || !data.enrolled)
    return <EmptyState title="You are not enrolled in this course." action={<Button asChild><Link to="/courses/$courseId" params={{ courseId }}>View course</Link></Button>} />;

  const pct = data.modules.length ? Math.round((data.status.modules_done / data.modules.length) * 100) : 0;

  async function toggleModule(id: string) {
    const { error } = data!.done.has(id)
      ? await supabase.from("module_completions").delete().eq("module_id", id).eq("trainee_id", uid)
      : await supabase.from("module_completions").insert({ module_id: id, trainee_id: uid });
    if (error) toast.error(errMsg(error));
    reload();
  }
  async function claim() {
    const { data: cert, error } = await supabase.rpc("claim_certificate", { _course: courseId });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Certificate issued!");
    reload();
    qc.invalidateQueries({ queryKey: ["unread-count"] });
    return cert;
  }

  return (
    <div>
      <PageHeader title={data.course.title} description={`${data.course.category} · ${data.course.difficulty}`} />
      <div className="mb-6 rounded-xl border bg-card p-5">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Course progress</span><span>{pct}%</span></div>
        <Progress value={pct} />
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>Modules: {data.status.modules_done}/{data.status.modules_total}</span>
          <span>Assignments submitted: {data.status.assignments_submitted}/{data.status.assignments_total}</span>
          <span>Assessments passed: {data.status.assessments_passed}/{data.status.assessments_total}</span>
        </div>
        <div className="mt-4">
          {data.certificate ? (
            <Button asChild><Link to="/certificates/$certificateId" params={{ certificateId: data.certificate.id }}><Award className="mr-2 h-4 w-4" />View certificate</Link></Button>
          ) : data.status.eligible ? (
            <Button onClick={claim} className="bg-accent text-accent-foreground hover:bg-accent/90"><Award className="mr-2 h-4 w-4" />Claim your certificate</Button>
          ) : (
            <p className="text-xs text-muted-foreground">Certificate requirement: complete every module, submit every assignment and pass every assessment.</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="modules">
        <TabsList className="flex-wrap">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="resources">Resources ({data.resources.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignments ({data.assignments.length})</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({data.assessments.length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4 space-y-3">
          {data.modules.length === 0 ? <EmptyState title="No modules yet." /> : data.modules.map((m, i) => {
            const done = data.done.has(m.id);
            return (
              <details key={m.id} className="rounded-xl border bg-card p-4" open={i === 0}>
                <summary className="flex cursor-pointer items-center gap-3">
                  {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  <span className="flex-1 font-medium">Module {i + 1}: {m.title}</span>
                </summary>
                <div className="mt-3 space-y-3 pl-8">
                  {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                  {m.content && <div className="whitespace-pre-wrap text-sm">{m.content}</div>}
                  {data.resources.filter((r) => r.module_id === m.id).map((r) => <ResourceRow key={r.id} r={r} />)}
                  <Button size="sm" variant={done ? "outline" : "default"} onClick={() => toggleModule(m.id)}>{done ? "Mark as not complete" : "Mark module complete"}</Button>
                </div>
              </details>
            );
          })}
        </TabsContent>

        <TabsContent value="resources" className="mt-4 space-y-2">
          {data.resources.length === 0 ? <EmptyState title="No resources yet." /> : data.resources.map((r) => <ResourceRow key={r.id} r={r} />)}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4 space-y-2">
          {data.assignments.length === 0 ? <EmptyState title="No assignments yet." /> : data.assignments.map((a) => {
            const s = data.subs.get(a.id);
            return (
              <Link key={a.id} to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm">
                <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">Due {fmtDate(a.deadline, true)} · {a.max_marks} marks</p></div>
                <div className="flex items-center gap-2">{s?.marks != null && <span className="text-sm font-semibold">{s.marks}/{a.max_marks}</span>}<StatusBadge status={s?.status ?? "not_started"} /></div>
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="assessments" className="mt-4 space-y-2">
          {data.assessments.length === 0 ? <EmptyState title="No assessments yet." /> : data.assessments.map((a) => {
            const at = data.attempts.get(a.id);
            return (
              <Link key={a.id} to="/assessments/$assessmentId" params={{ assessmentId: a.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm">
                <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.duration_minutes} min · pass {a.passing_percentage}%{a.deadline ? ` · closes ${fmtDate(a.deadline, true)}` : ""}</p></div>
                {at?.submitted_at ? <span className="flex items-center gap-2 text-sm font-semibold">{Number(at.percentage)}%<StatusBadge status={at.passed ? "passed" : "failed"} /></span> : <StatusBadge status={at ? "in_progress" : "not_started"} />}
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4"><FeedbackForm courseId={courseId} uid={uid} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceRow({ r }: { r: { id: string; title: string; description: string | null; resource_type: string; file_path: string | null; external_url: string | null } }) {
  async function open() {
    try {
      if (r.external_url) window.open(r.external_url, "_blank", "noopener");
      else if (r.file_path) await openFile("course-files", r.file_path);
    } catch (e) { toast.error(errMsg(e)); }
  }
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background p-3">
      <div>
        <p className="text-sm font-medium">{r.title}</p>
        <p className="text-xs capitalize text-muted-foreground">{r.resource_type.replace(/_/g, " ")}{r.description ? ` · ${r.description}` : ""}</p>
      </div>
      <Button size="sm" variant="outline" onClick={open}>{r.external_url ? <><ExternalLink className="mr-1 h-4 w-4" />Open</> : <><FileDown className="mr-1 h-4 w-4" />Download</>}</Button>
    </div>
  );
}

function FeedbackForm({ courseId, uid }: { courseId: string; uid: string }) {
  const qc = useQueryClient();
  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-feedback", courseId, uid],
    queryFn: async () => (await supabase.from("feedback").select("*").eq("course_id", courseId).eq("trainee_id", uid).maybeSingle()).data,
  });
  const [rating, setRating] = useState<number | null>(null);
  if (isLoading) return <Loading />;
  const r = rating ?? existing?.rating ?? 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (r < 1) { toast.error("Please choose a rating"); return; }
    const f = new FormData(e.currentTarget);
    const row = { course_id: courseId, trainee_id: uid, rating: r, comments: String(f.get("comments") ?? "").slice(0, 2000), resource_feedback: String(f.get("resource_feedback") ?? "").slice(0, 2000) };
    const { error } = existing
      ? await supabase.from("feedback").update(row).eq("id", existing.id)
      : await supabase.from("feedback").insert(row);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(existing ? "Feedback updated" : "Thank you for your feedback");
    qc.invalidateQueries({ queryKey: ["my-feedback"] });
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">One feedback entry per course — you can update it any time.</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star className={cn("h-7 w-7", n <= r ? "fill-accent text-accent" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <div className="space-y-2"><Label>Comments</Label><Textarea name="comments" defaultValue={existing?.comments ?? ""} maxLength={2000} /></div>
      <div className="space-y-2"><Label>Resource feedback (optional)</Label><Textarea name="resource_feedback" defaultValue={existing?.resource_feedback ?? ""} maxLength={2000} /></div>
      <Button>{existing ? "Update feedback" : "Submit feedback"}</Button>
    </form>
  );
}
