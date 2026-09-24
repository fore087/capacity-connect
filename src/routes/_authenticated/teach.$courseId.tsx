import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { openFile, uploadFile, validateFile } from "@/lib/files";
import { CourseFields, SubmitRow, readCourseForm } from "@/components/CourseForm";
import { EmptyState, Loading, PageHeader, StatusBadge, errMsg, fmtDate, toLocalInput } from "@/components/common";
import { UserAvatar } from "@/components/Avatar";
import { FeedbackTab } from "@/components/CourseFeedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/teach/$courseId")({
  head: () => ({ meta: [{ title: "Manage course — Capacity Connect" }] }),
  component: ManageCourse,
});

type Module = Database["public"]["Tables"]["course_modules"]["Row"];
type ResourceType = Database["public"]["Enums"]["resource_type"];
const RESOURCE_TYPES: ResourceType[] = ["recorded_lecture", "video", "pdf", "presentation", "document", "study_material", "external_link"];
const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />;

function ManageCourse() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const { data: course, isLoading } = useQuery({
    queryKey: ["teach-course", courseId],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", courseId).maybeSingle()).data,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["teach-modules", courseId],
    queryFn: async () => (await supabase.from("course_modules").select("*").eq("course_id", courseId).order("position")).data ?? [],
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["teach-course", courseId] });

  if (isLoading) return <Loading />;
  if (!course) return <EmptyState title="Course not found" />;

  async function setStatus(status: "draft" | "published" | "archived") {
    if (status === "published" && modules.length === 0) { toast.error("Add at least one module before publishing"); return; }
    const { error } = await supabase.from("courses").update({ status, updated_at: new Date().toISOString() }).eq("id", courseId);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Course ${status === "published" ? "published" : status === "draft" ? "unpublished" : "archived"}`);
    reload();
  }

  return (
    <div>
      <PageHeader
        title={course.title}
        description={`${course.category} · ${course.difficulty}`}
        actions={
          <>
            <StatusBadge status={course.status} />
            {course.status !== "published" && <Button size="sm" onClick={() => setStatus("published")}>Publish</Button>}
            {course.status === "published" && <Button size="sm" variant="outline" onClick={() => setStatus("draft")}>Unpublish</Button>}
            {course.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => setStatus("archived")}>Archive</Button>}
          </>
        }
      />
      <Tabs defaultValue="modules">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="trainees">Trainees</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4"><DetailsTab course={course} onSaved={reload} /></TabsContent>
        <TabsContent value="modules" className="mt-4"><ModulesTab courseId={courseId} modules={modules} /></TabsContent>
        <TabsContent value="resources" className="mt-4"><ResourcesTab courseId={courseId} modules={modules} /></TabsContent>
        <TabsContent value="assignments" className="mt-4"><AssignmentsTab courseId={courseId} modules={modules} /></TabsContent>
        <TabsContent value="assessments" className="mt-4"><AssessmentsTab courseId={courseId} modules={modules} /></TabsContent>
        <TabsContent value="trainees" className="mt-4"><TraineesTab courseId={courseId} moduleCount={modules.length} /></TabsContent>
        <TabsContent value="feedback" className="mt-4"><FeedbackTab courseId={courseId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ course, onSaved }: { course: Database["public"]["Tables"]["courses"]["Row"]; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = readCourseForm(e.currentTarget);
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message); return; }
    setBusy(true);
    const { error } = await supabase.from("courses").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", course.id);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Course saved");
    onSaved();
  }
  async function remove() {
    if (!confirm("Delete this draft course permanently?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) { toast.error(errMsg(error)); return; }
    navigate({ to: "/teach" });
  }
  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-5">
      <CourseFields c={course} />
      <div className="flex justify-between">
        <SubmitRow busy={busy} label="Save changes" />
        {course.status === "draft" && <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>Delete draft</Button>}
      </div>
    </form>
  );
}

function ModulesTab({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Module | "new" | null>(null);
  const reload = () => qc.invalidateQueries({ queryKey: ["teach-modules", courseId] });

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 2) { toast.error("Module title is required"); return; }
    const row = { title: title.slice(0, 200), description: String(f.get("description") ?? "").slice(0, 2000), content: String(f.get("content") ?? "").slice(0, 20000) };
    const { error } = edit === "new"
      ? await supabase.from("course_modules").insert({ ...row, course_id: courseId, position: modules.length })
      : await supabase.from("course_modules").update(row).eq("id", (edit as Module).id);
    if (error) { toast.error(errMsg(error)); return; }
    setEdit(null);
    reload();
  }
  async function move(i: number, dir: -1 | 1) {
    const a = modules[i], b = modules[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("course_modules").update({ position: b.position }).eq("id", a.id),
      supabase.from("course_modules").update({ position: a.position }).eq("id", b.id),
    ]);
    reload();
  }
  async function remove(id: string) {
    if (!confirm("Delete this module?")) return;
    await supabase.from("course_modules").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setEdit("new")}><Plus className="mr-1 h-4 w-4" />Add module</Button>
      {modules.length === 0 ? <EmptyState title="No modules yet." /> : modules.map((m, i) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <span className="font-mono text-sm text-muted-foreground">{i + 1}</span>
          <div className="flex-1"><p className="font-medium">{m.title}</p>{m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}</div>
          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === modules.length - 1} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEdit(m)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => remove(m.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit === "new" ? "Add module" : "Edit module"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input name="title" defaultValue={edit && edit !== "new" ? edit.title : ""} required /></div>
            <div className="space-y-2"><Label>Short description</Label><Input name="description" defaultValue={edit && edit !== "new" ? edit.description ?? "" : ""} /></div>
            <div className="space-y-2"><Label>Lesson content</Label><Textarea name="content" rows={8} defaultValue={edit && edit !== "new" ? edit.content ?? "" : ""} /></div>
            <Button>Save module</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResourcesTab({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ResourceType>("pdf");
  const [busy, setBusy] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["teach-resources", courseId],
    queryFn: async () => (await supabase.from("resources").select("*").eq("course_id", courseId).order("created_at", { ascending: false })).data ?? [],
  });

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (!title) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      let file_path: string | null = null;
      let external_url: string | null = null;
      if (type === "external_link") {
        const u = z.string().url().safeParse(String(f.get("url") ?? "").trim());
        if (!u.success || !/^https?:/.test(u.data)) throw new Error("Enter a valid http(s) link");
        external_url = u.data;
      } else {
        const file = f.get("file") as File | null;
        const url = String(f.get("url") ?? "").trim();
        if (file && file.size > 0) {
          const err = validateFile(file, "course-files");
          if (err) throw new Error(err);
          file_path = await uploadFile("course-files", courseId, file);
        } else if (url) {
          if (!/^https?:\/\//.test(url)) throw new Error("Enter a valid http(s) link");
          external_url = url;
        } else throw new Error("Upload a file or provide a link");
      }
      const { error } = await supabase.from("resources").insert({
        course_id: courseId, trainer_id: session!.user.id, title: title.slice(0, 200), description: String(f.get("description") ?? "").slice(0, 1000),
        resource_type: type, module_id: String(f.get("module_id") || "") || null, visibility: String(f.get("visibility")) === "public" ? "public" : "enrolled", file_path, external_url,
      });
      if (error) throw error;
      toast.success("Resource added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["teach-resources", courseId] });
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }
  async function remove(id: string, path: string | null) {
    if (!confirm("Delete this resource?")) return;
    if (path) await supabase.storage.from("course-files").remove([path]);
    await supabase.from("resources").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["teach-resources", courseId] });
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Add resource</Button>
      {data.length === 0 ? <EmptyState title="No resources yet." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">Module</th><th className="p-3">Visibility</th><th className="p-3">Uploaded</th><th /></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3 capitalize">{r.resource_type.replace(/_/g, " ")}</td>
                  <td className="p-3">{modules.find((m) => m.id === r.module_id)?.title ?? "—"}</td>
                  <td className="p-3 capitalize">{r.visibility}</td>
                  <td className="p-3">{fmtDate(r.created_at)}</td>
                  <td className="flex justify-end gap-1 p-3">
                    <Button size="icon" variant="ghost" aria-label="Open" onClick={() => (r.external_url ? window.open(r.external_url, "_blank", "noopener") : openFile("course-files", r.file_path!))}>{r.external_url ? <ExternalLink className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}</Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(r.id, r.file_path)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add learning resource</DialogTitle></DialogHeader>
          <form onSubmit={add} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
            <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Type</Label><Sel value={type} onChange={(e) => setType(e.target.value as ResourceType)}>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Sel></div>
              <div className="space-y-2"><Label>Module</Label><Sel name="module_id" defaultValue=""><option value="">Whole course</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Sel></div>
            </div>
            {type !== "external_link" && <div className="space-y-2"><Label>File (max 50 MB)</Label><Input name="file" type="file" /></div>}
            <div className="space-y-2"><Label>{type === "external_link" ? "Link URL" : "…or a link (e.g. hosted video)"}</Label><Input name="url" placeholder="https://" /></div>
            <div className="space-y-2"><Label>Visibility</Label><Sel name="visibility" defaultValue="enrolled"><option value="enrolled">Enrolled trainees only</option><option value="public">Public (any signed-in user)</option></Sel></div>
            <Button disabled={busy}>{busy ? "Uploading…" : "Add resource"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignmentsTab({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const qc = useQueryClient();
  type A = Database["public"]["Tables"]["assignments"]["Row"];
  const [edit, setEdit] = useState<A | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["teach-assignments", courseId],
    queryFn: async () => (await supabase.from("assignments").select("*, assignment_submissions(status)").eq("course_id", courseId).order("deadline")).data ?? [],
  });
  const schema = z.object({
    title: z.string().trim().min(3, "Title is required").max(200),
    description: z.string().max(2000), instructions: z.string().max(10000), submission_rules: z.string().max(2000),
    deadline: z.string().min(1, "Deadline is required"),
    max_marks: z.coerce.number().int().min(1, "Max marks must be at least 1").max(1000),
    allowed_file_types: z.string().max(200).regex(/^[a-zA-Z0-9, .]*$/, "Use comma separated extensions, e.g. pdf,docx"),
  });

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = schema.safeParse(Object.fromEntries(["title", "description", "instructions", "submission_rules", "deadline", "max_marks", "allowed_file_types"].map((k) => [k, String(f.get(k) ?? "")])));
    if (!p.success) { toast.error(p.error.errors[0]?.message); return; }
    setBusy(true);
    try {
      let attachment_path = edit && edit !== "new" ? edit.attachment_path : null;
      const file = f.get("file") as File | null;
      if (file && file.size > 0) {
        const err = validateFile(file, "course-files");
        if (err) throw new Error(err);
        attachment_path = await uploadFile("course-files", courseId, file);
      }
      const row = { ...p.data, deadline: new Date(p.data.deadline).toISOString(), module_id: String(f.get("module_id") || "") || null, attachment_path };
      const { error } = edit === "new" ? await supabase.from("assignments").insert({ ...row, course_id: courseId }) : await supabase.from("assignments").update(row).eq("id", (edit as A).id);
      if (error) throw error;
      toast.success(edit === "new" ? "Assignment published to enrolled trainees" : "Assignment updated");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["teach-assignments", courseId] });
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm("Delete this assignment and all its submissions?")) return;
    await supabase.from("assignments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["teach-assignments", courseId] });
  }
  const e = edit && edit !== "new" ? edit : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Button onClick={() => setEdit("new")}><Plus className="mr-1 h-4 w-4" />New assignment</Button><Button asChild variant="outline"><Link to="/teach/submissions">Review submissions</Link></Button></div>
      {data.length === 0 ? <EmptyState title="No assignments yet." /> : data.map((a) => {
        const subs = a.assignment_submissions ?? [];
        const pending = subs.filter((s) => s.status === "submitted" || s.status === "late").length;
        return (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex-1"><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">Due {fmtDate(a.deadline, true)} · {a.max_marks} marks · {subs.filter((s) => s.status !== "in_progress").length} submitted · {pending} to evaluate</p></div>
            <Button size="icon" variant="ghost" onClick={() => setEdit(a)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
          </div>
        );
      })}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{e ? "Edit assignment" : "New assignment"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" defaultValue={e?.title} required /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input name="description" defaultValue={e?.description ?? ""} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Instructions</Label><Textarea name="instructions" rows={5} defaultValue={e?.instructions ?? ""} /></div>
            <div className="space-y-2"><Label>Module</Label><Sel name="module_id" defaultValue={e?.module_id ?? ""}><option value="">Whole course</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Sel></div>
            <div className="space-y-2"><Label>Deadline</Label><Input name="deadline" type="datetime-local" defaultValue={toLocalInput(e?.deadline)} required /></div>
            <div className="space-y-2"><Label>Maximum marks</Label><Input name="max_marks" type="number" min={1} defaultValue={e?.max_marks ?? 100} /></div>
            <div className="space-y-2"><Label>Allowed file types</Label><Input name="allowed_file_types" defaultValue={e?.allowed_file_types ?? "pdf,docx,zip"} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Submission rules</Label><Textarea name="submission_rules" rows={2} defaultValue={e?.submission_rules ?? ""} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Attachment (optional)</Label><Input name="file" type="file" /></div>
            <div className="md:col-span-2"><Button disabled={busy}>{busy ? "Saving…" : "Save assignment"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentsTab({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["teach-assessments", courseId],
    queryFn: async () => (await supabase.from("assessments").select("*, assessment_questions(count), assessment_attempts(count)").eq("course_id", courseId).order("created_at")).data ?? [],
  });
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 3) { toast.error("Title is required"); return; }
    const { data: a, error } = await supabase.from("assessments").insert({ course_id: courseId, title, module_id: String(f.get("module_id") || "") || null }).select("id").single();
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["teach-assessments", courseId] });
    navigate({ to: "/teach/assessments/$assessmentId", params: { assessmentId: a.id } });
  }
  const count = (x: unknown) => (x as { count: number }[])[0]?.count ?? 0;
  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New assessment</Button>
      {data.length === 0 ? <EmptyState title="No assessments yet." /> : data.map((a) => (
        <Link key={a.id} to="/teach/assessments/$assessmentId" params={{ assessmentId: a.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm">
          <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{count(a.assessment_questions)} questions · {count(a.assessment_attempts)} attempts · {a.duration_minutes} min</p></div>
          <StatusBadge status={a.published ? "published" : "draft"} />
        </Link>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New MCQ assessment</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
            <div className="space-y-2"><Label>Module</Label><Sel name="module_id" defaultValue=""><option value="">Whole course</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Sel></div>
            <Button>Create and add questions</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TraineesTab({ courseId, moduleCount }: { courseId: string; moduleCount: number }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["teach-trainees", courseId],
    queryFn: async () => {
      const [{ data: enr }, { data: done }] = await Promise.all([
        supabase.from("enrollments").select("id, enrolled_at, completed_at, trainee_id, profiles(full_name,email,avatar_url)").eq("course_id", courseId).order("enrolled_at"),
        supabase.from("module_completions").select("trainee_id, course_modules!inner(course_id)").eq("course_modules.course_id", courseId),
      ]);
      const counts = new Map<string, number>();
      (done ?? []).forEach((d) => counts.set(d.trainee_id, (counts.get(d.trainee_id) ?? 0) + 1));
      return (enr ?? []).map((e) => ({ ...e, done: counts.get(e.trainee_id) ?? 0 }));
    },
  });
  async function remove(id: string) {
    if (!confirm("Remove this trainee from the course?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["teach-trainees", courseId] });
  }
  const rows = data.filter((r) => `${r.profiles?.full_name} ${r.profiles?.email}`.toLowerCase().includes(q.toLowerCase()));
  if (isLoading) return <Loading />;
  return (
    <div className="space-y-3">
      <Input placeholder="Search trainees…" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-sm" />
      {rows.length === 0 ? <EmptyState title="No trainees enrolled yet." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">Trainee</th><th className="p-3">Enrolled</th><th className="p-3">Progress</th><th className="p-3">Status</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="flex items-center gap-3 p-3"><UserAvatar path={r.profiles?.avatar_url} name={r.profiles?.full_name ?? ""} size={32} /><div><p className="font-medium">{r.profiles?.full_name}</p><p className="text-xs text-muted-foreground">{r.profiles?.email}</p></div></td>
                  <td className="p-3">{fmtDate(r.enrolled_at)}</td>
                  <td className="p-3">{r.done}/{moduleCount} modules</td>
                  <td className="p-3"><StatusBadge status={r.completed_at ? "completed" : "in_progress"} /></td>
                  <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

