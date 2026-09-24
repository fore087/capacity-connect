import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fileName, openFile, parseExtList, uploadFile, validateFile } from "@/lib/files";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assignments/$assignmentId")({
  head: () => ({ meta: [{ title: "Assignment — Capacity Connect" }] }),
  component: AssignmentPage,
});

function AssignmentPage() {
  const { assignmentId } = Route.useParams();
  const { session, role } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId, uid],
    queryFn: async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from("assignments").select("*, courses(title), course_modules(title)").eq("id", assignmentId).maybeSingle(),
        supabase.from("assignment_submissions").select("*").eq("assignment_id", assignmentId).eq("trainee_id", uid).maybeSingle(),
      ]);
      return { a, s };
    },
  });
  if (isLoading) return <Loading />;
  const a = data?.a;
  const s = data?.s;
  if (!a) return <EmptyState title="Assignment not available" description="You may not be enrolled in this course." />;

  const allowed = parseExtList(a.allowed_file_types);
  const pastDeadline = new Date(a.deadline) < new Date();
  const locked = s?.status === "evaluated";

  async function save(final: boolean, comments: string) {
    setBusy(true);
    try {
      let path = s?.file_path ?? null;
      if (file) {
        const err = validateFile(file, "submissions", allowed);
        if (err) throw new Error(err);
        path = await uploadFile("submissions", `${uid}/${assignmentId}`, file);
      }
      const row = { assignment_id: assignmentId, trainee_id: uid, file_path: path, comments: comments.slice(0, 4000), status: (final ? "submitted" : "in_progress") as "submitted" | "in_progress" };
      const { error } = s
        ? await supabase.from("assignment_submissions").update(row).eq("id", s.id)
        : await supabase.from("assignment_submissions").insert(row);
      if (error) throw error;
      toast.success(final ? "Assignment submitted" : "Draft saved");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["assignment", assignmentId] });
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={a.title} description={`${a.courses?.title ?? ""}${a.course_modules?.title ? ` · ${a.course_modules.title}` : ""}`} actions={<StatusBadge status={s?.status ?? "not_started"} />} />
      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-semibold">{fmtDate(a.deadline, true)}</p>{pastDeadline && <p className="text-xs text-destructive">Deadline passed — late submissions are marked LATE</p>}</div>
        <div><p className="text-xs text-muted-foreground">Maximum marks</p><p className="font-semibold">{a.max_marks}</p></div>
        <div><p className="text-xs text-muted-foreground">Allowed file types</p><p className="font-semibold">{allowed.join(", ") || "Any"}</p></div>
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5">
        {a.description && <p>{a.description}</p>}
        {a.instructions && (<div><h2 className="font-semibold">Instructions</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.instructions}</p></div>)}
        {a.submission_rules && (<div><h2 className="font-semibold">Submission rules</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.submission_rules}</p></div>)}
        {a.attachment_path && <Button variant="outline" size="sm" onClick={() => openFile("course-files", a.attachment_path!).catch((e) => toast.error(errMsg(e)))}><FileDown className="mr-2 h-4 w-4" />Download attached material</Button>}
      </section>

      {s?.status === "evaluated" && (
        <section className="rounded-xl border-2 border-success bg-card p-5">
          <h2 className="font-semibold">Evaluation</h2>
          <p className="mt-2 font-display text-3xl font-bold">{Number(s.marks)} / {a.max_marks}</p>
          {s.feedback && <p className="mt-3 whitespace-pre-wrap text-sm">{s.feedback}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Evaluated {fmtDate(s.evaluated_at, true)}</p>
        </section>
      )}

      {role === "trainee" && (
        <form
          className="space-y-4 rounded-xl border bg-card p-5"
          onSubmit={(e) => { e.preventDefault(); const c = String(new FormData(e.currentTarget).get("comments") ?? ""); const final = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "submit"; save(final, c); }}
        >
          <h2 className="font-semibold">Your submission</h2>
          {s?.submitted_at && <p className="text-sm text-muted-foreground">Last submitted {fmtDate(s.submitted_at, true)}</p>}
          {s?.file_path && <Button type="button" variant="link" className="h-auto p-0" onClick={() => openFile("submissions", s.file_path!)}>{fileName(s.file_path)}</Button>}
          {!locked && (
            <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{file ? file.name : s?.file_path ? "Replace file (optional)" : "Choose a file to upload (max 20 MB)"}</span>
              <input type="file" className="hidden" accept={allowed.map((x) => "." + x).join(",")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Label>
          )}
          <div className="space-y-2"><Label>Comments</Label><Textarea name="comments" defaultValue={s?.comments ?? ""} disabled={locked} maxLength={4000} /></div>
          {!locked && (
            <div className="flex gap-2">
              <Button type="submit" value="draft" variant="outline" disabled={busy}>Save draft</Button>
              <Button type="submit" value="submit" disabled={busy}>{busy ? "Saving…" : s && s.status !== "in_progress" ? "Resubmit" : "Submit assignment"}</Button>
            </div>
          )}
        </form>
      )}
      <Button asChild variant="ghost"><Link to="/assignments">← All assignments</Link></Button>
    </div>
  );
}
