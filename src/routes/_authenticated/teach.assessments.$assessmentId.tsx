import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate, toLocalInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/teach/assessments/$assessmentId")({
  head: () => ({ meta: [{ title: "Edit assessment — Capacity Connect" }] }),
  component: EditAssessment,
});

type Question = Database["public"]["Tables"]["assessment_questions"]["Row"];

function EditAssessment() {
  const { assessmentId } = Route.useParams();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Question | "new" | null>(null);
  const [optCount, setOptCount] = useState(4);

  const { data, isLoading } = useQuery({
    queryKey: ["edit-assessment", assessmentId],
    queryFn: async () => {
      const [a, q, at] = await Promise.all([
        supabase.from("assessments").select("*, courses(title)").eq("id", assessmentId).maybeSingle(),
        supabase.from("assessment_questions").select("*").eq("assessment_id", assessmentId).order("position"),
        supabase.from("assessment_attempts").select("*, profiles(full_name,email)").eq("assessment_id", assessmentId).order("submitted_at", { ascending: false }),
      ]);
      return { a: a.data, questions: q.data ?? [], attempts: at.data ?? [] };
    },
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["edit-assessment", assessmentId] });
  if (isLoading) return <Loading />;
  const a = data?.a;
  if (!a) return <EmptyState title="Assessment not found" />;
  const hasAttempts = data!.attempts.length > 0;

  async function saveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const duration = Number(f.get("duration_minutes")), pass = Number(f.get("passing_percentage"));
    if (!(duration >= 1 && duration <= 600)) { toast.error("Duration must be 1–600 minutes"); return; }
    if (!(pass >= 0 && pass <= 100)) { toast.error("Passing percentage must be 0–100"); return; }
    const start = String(f.get("start_at") || ""), end = String(f.get("deadline") || "");
    if (start && end && new Date(start) >= new Date(end)) { toast.error("Deadline must be after the start date"); return; }
    const { error } = await supabase.from("assessments").update({
      title: String(f.get("title") ?? "").trim().slice(0, 200) || a!.title, description: String(f.get("description") ?? "").slice(0, 2000),
      duration_minutes: duration, passing_percentage: pass,
      start_at: start ? new Date(start).toISOString() : null, deadline: end ? new Date(end).toISOString() : null,
    }).eq("id", assessmentId);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Settings saved");
    reload();
  }
  async function togglePublish() {
    if (!a!.published && data!.questions.length === 0) { toast.error("Add at least one question first"); return; }
    const { error } = await supabase.from("assessments").update({ published: !a!.published }).eq("id", assessmentId);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(a!.published ? "Assessment hidden from trainees" : "Assessment published — enrolled trainees notified");
    reload();
  }
  async function saveQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const question = String(f.get("question") ?? "").trim();
    const options = Array.from({ length: optCount }, (_, i) => String(f.get(`opt${i}`) ?? "").trim());
    const correct = Number(f.get("correct"));
    const marks = Number(f.get("marks"));
    if (!question) { toast.error("Question text is required"); return; }
    if (options.some((o) => !o)) { toast.error("Fill in every option"); return; }
    if (!(correct >= 0 && correct < optCount)) { toast.error("Choose the correct answer"); return; }
    if (!(marks >= 1 && marks <= 100)) { toast.error("Marks must be 1–100"); return; }
    const row = { question: question.slice(0, 2000), options, correct_index: correct, marks };
    const { error } = edit === "new"
      ? await supabase.from("assessment_questions").insert({ ...row, assessment_id: assessmentId, position: data!.questions.length })
      : await supabase.from("assessment_questions").update(row).eq("id", (edit as Question).id);
    if (error) { toast.error(errMsg(error)); return; }
    setEdit(null);
    reload();
  }
  async function removeQ(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("assessment_questions").delete().eq("id", id);
    reload();
  }
  function openEditor(q: Question | "new") {
    setOptCount(q === "new" ? 4 : (q.options as string[]).length);
    setEdit(q);
  }
  const e = edit && edit !== "new" ? edit : null;
  const totalMarks = data!.questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div>
      <PageHeader title={a.title} description={a.courses?.title}
        actions={<><StatusBadge status={a.published ? "published" : "draft"} /><Button size="sm" onClick={togglePublish}>{a.published ? "Unpublish" : "Publish"}</Button><Button size="sm" variant="ghost" asChild><Link to="/teach/$courseId" params={{ courseId: a.course_id }}>Back to course</Link></Button></>} />
      {hasAttempts && <p className="mb-4 rounded-lg bg-secondary p-3 text-sm">Trainees have already attempted this assessment. Editing questions will not change existing results.</p>}
      <Tabs defaultValue="questions">
        <TabsList><TabsTrigger value="questions">Questions ({data!.questions.length})</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger><TabsTrigger value="results">Results ({data!.attempts.filter((x) => x.submitted_at).length})</TabsTrigger></TabsList>
        <TabsContent value="questions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between"><Button onClick={() => openEditor("new")}><Plus className="mr-1 h-4 w-4" />Add question</Button><span className="text-sm text-muted-foreground">Total: {totalMarks} marks</span></div>
          {data!.questions.length === 0 ? <EmptyState title="No questions yet." /> : data!.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-medium">{i + 1}. {q.question} <span className="text-xs text-muted-foreground">({q.marks} mark{q.marks > 1 ? "s" : ""})</span></p>
                <Button size="icon" variant="ghost" onClick={() => openEditor(q)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeQ(q.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <ul className="mt-2 grid gap-1 pl-5 text-sm sm:grid-cols-2">
                {(q.options as string[]).map((o, j) => <li key={j} className={j === q.correct_index ? "font-semibold text-success" : "text-muted-foreground"}>{String.fromCharCode(65 + j)}. {o}</li>)}
              </ul>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <form onSubmit={saveMeta} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" defaultValue={a.title} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={a.description ?? ""} /></div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input name="duration_minutes" type="number" min={1} defaultValue={a.duration_minutes} /></div>
            <div className="space-y-2"><Label>Passing percentage</Label><Input name="passing_percentage" type="number" min={0} max={100} defaultValue={a.passing_percentage} /></div>
            <div className="space-y-2"><Label>Start date (optional)</Label><Input name="start_at" type="datetime-local" defaultValue={toLocalInput(a.start_at)} /></div>
            <div className="space-y-2"><Label>Deadline (optional)</Label><Input name="deadline" type="datetime-local" defaultValue={toLocalInput(a.deadline)} /></div>
            <div><Button>Save settings</Button></div>
          </form>
        </TabsContent>
        <TabsContent value="results" className="mt-4">
          {data!.attempts.length === 0 ? <EmptyState title="No attempts yet." /> : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Trainee</th><th className="p-3">Submitted</th><th className="p-3">Score</th><th className="p-3">Correct / Incorrect</th><th className="p-3">Result</th></tr></thead>
                <tbody>
                  {data!.attempts.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-3">{t.profiles?.full_name}</td>
                      <td className="p-3">{t.submitted_at ? fmtDate(t.submitted_at, true) : "In progress"}</td>
                      <td className="p-3">{t.submitted_at ? `${t.obtained_marks}/${t.total_marks} (${Number(t.percentage)}%)` : "—"}</td>
                      <td className="p-3">{t.submitted_at ? `${t.correct_count} / ${t.incorrect_count}` : "—"}</td>
                      <td className="p-3">{t.submitted_at && <StatusBadge status={t.passed ? "passed" : "failed"} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{e ? "Edit question" : "Add question"}</DialogTitle></DialogHeader>
          <form onSubmit={saveQuestion} className="space-y-4">
            <div className="space-y-2"><Label>Question</Label><Textarea name="question" defaultValue={e?.question ?? ""} required /></div>
            <p className="text-sm text-muted-foreground">Enter the options and select the correct answer.</p>
            {Array.from({ length: optCount }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" value={i} defaultChecked={e ? e.correct_index === i : i === 0} aria-label={`Option ${i + 1} is correct`} />
                <Input name={`opt${i}`} placeholder={`Option ${String.fromCharCode(65 + i)}`} defaultValue={e ? ((e.options as string[])[i] ?? "") : ""} />
              </div>
            ))}
            <div className="flex gap-2">
              {optCount < 8 && <Button type="button" size="sm" variant="outline" onClick={() => setOptCount(optCount + 1)}>Add option</Button>}
              {optCount > 4 && <Button type="button" size="sm" variant="ghost" onClick={() => setOptCount(optCount - 1)}>Remove last option</Button>}
            </div>
            <div className="w-32 space-y-2"><Label>Marks</Label><Input name="marks" type="number" min={1} defaultValue={e?.marks ?? 1} /></div>
            <Button>Save question</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
