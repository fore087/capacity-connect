import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Clock, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PublicFooter, PublicNav } from "@/components/PublicNav";
import { EmptyState, Loading, errMsg } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course details — Capacity Connect" },
      { name: "description", content: "Course overview, modules, objectives and trainer information." },
      { property: "og:title", content: "Course details — Capacity Connect" },
      { property: "og:description", content: "See what you'll learn and enrol." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { session, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-public", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*, course_modules(id,title,description,position)").eq("id", courseId).maybeSingle();
      return data;
    },
  });
  const { data: trainer } = useQuery({
    queryKey: ["trainer-info", course?.trainer_id],
    enabled: !!course,
    queryFn: async () => (await supabase.rpc("trainer_public_info", { _ids: [course!.trainer_id] })).data?.[0] ?? null,
  });
  const { data: enrolled } = useQuery({
    queryKey: ["enrolled", courseId, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("id").eq("course_id", courseId).eq("trainee_id", session!.user.id).maybeSingle();
      return !!data;
    },
  });

  async function enroll() {
    if (!session) { navigate({ to: "/auth", search: { mode: "register" } }); return; }
    setBusy(true);
    const { error } = await supabase.from("enrollments").insert({ course_id: courseId, trainee_id: session.user.id });
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "You are already enrolled" : errMsg(error)); return; }
    toast.success("Enrolled! Let's start learning.");
    qc.invalidateQueries();
    navigate({ to: "/learn/$courseId", params: { courseId } });
  }

  const modules = [...(course?.course_modules ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      {isLoading ? (
        <Loading />
      ) : !course ? (
        <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Course not found" description="It may be unpublished or removed." /></div>
      ) : (
        <>
          <section className="bg-hero text-primary-foreground">
            <div className="mx-auto max-w-6xl px-4 py-14">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-accent text-accent-foreground">{course.category}</Badge>
                <Badge variant="outline" className="border-primary-foreground/40 capitalize text-primary-foreground">{course.difficulty}</Badge>
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold md:text-4xl">{course.title}</h1>
              <p className="mt-4 max-w-3xl text-primary-foreground/80">{course.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/80">
                <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> {modules.length} modules</span>
                {course.duration && <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {course.duration}</span>}
                {trainer && <span>Trainer: <strong className="text-primary-foreground">{trainer.full_name}</strong></span>}
              </div>
              <div className="mt-8">
                {enrolled ? (
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link to="/learn/$courseId" params={{ courseId }}>Continue learning</Link>
                  </Button>
                ) : session && role !== "trainee" ? (
                  <p className="text-sm text-primary-foreground/70">Only trainee accounts can enrol in courses.</p>
                ) : course.status !== "published" ? (
                  <p className="text-sm text-primary-foreground/70">This course is not open for enrolment.</p>
                ) : (
                  <Button size="lg" onClick={enroll} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {busy ? "Enrolling…" : session ? "Enrol in this course" : "Sign up to enrol"}
                  </Button>
                )}
              </div>
            </div>
          </section>
          <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-12 md:grid-cols-3">
            <div className="space-y-8 md:col-span-2">
              {course.learning_objectives && (
                <section>
                  <h2 className="text-xl font-bold">What you'll learn</h2>
                  <ul className="mt-3 space-y-2">
                    {course.learning_objectives.split("\n").filter(Boolean).map((o, i) => (
                      <li key={i} className="flex gap-2 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{o}</li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h2 className="text-xl font-bold">Course modules</h2>
                {modules.length === 0 ? (
                  <p className="mt-3 text-muted-foreground">No modules added yet.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {modules.map((m, i) => (
                      <li key={m.id} className="flex gap-3 rounded-lg border bg-card p-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{i + 1}</span>
                        <div><p className="font-medium">{m.title}</p>{m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
            <aside className="space-y-4">
              {trainer && (
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Your trainer</p>
                  <p className="mt-2 font-semibold">{trainer.full_name}</p>
                  {trainer.specialization && <p className="text-sm text-primary">{trainer.specialization}</p>}
                  {trainer.qualification && <p className="mt-1 text-sm text-muted-foreground">{trainer.qualification}</p>}
                  {trainer.bio && <p className="mt-3 text-sm text-muted-foreground">{trainer.bio}</p>}
                </div>
              )}
              {(course.prerequisites || course.skills) && (
                <div className="rounded-xl border bg-card p-5 text-sm">
                  {course.prerequisites && (<><p className="font-semibold">Prerequisites</p><p className="mt-1 text-muted-foreground">{course.prerequisites}</p></>)}
                  {course.skills && (<><p className="mt-4 font-semibold">Skills</p><div className="mt-2 flex flex-wrap gap-1">{course.skills.split(",").map((s) => <Badge key={s} variant="secondary">{s.trim()}</Badge>)}</div></>)}
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl border bg-secondary p-4 text-sm text-secondary-foreground">
                <BookOpen className="h-4 w-4" /> Resources, assignments and assessments unlock after enrolment.
              </div>
            </aside>
          </div>
        </>
      )}
      <PublicFooter />
    </div>
  );
}
