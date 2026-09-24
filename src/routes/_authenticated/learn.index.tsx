import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatusBadge } from "@/components/common";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({ meta: [{ title: "My learning — Capacity Connect" }] }),
  component: MyLearning,
});

function MyLearning() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const { data, isLoading } = useQuery({
    queryKey: ["my-learning", uid],
    queryFn: async () => {
      const [{ data: enr }, { data: done }] = await Promise.all([
        supabase.from("enrollments").select("id, enrolled_at, completed_at, course_id, courses(title, category, course_modules(id))").eq("trainee_id", uid).order("enrolled_at", { ascending: false }),
        supabase.from("module_completions").select("module_id").eq("trainee_id", uid),
      ]);
      const doneSet = new Set((done ?? []).map((d) => d.module_id));
      return (enr ?? []).map((e) => {
        const mods = e.courses?.course_modules ?? [];
        const completed = mods.filter((m) => doneSet.has(m.id)).length;
        return { ...e, total: mods.length, completed, pct: mods.length ? Math.round((completed / mods.length) * 100) : 0 };
      });
    },
  });

  return (
    <div>
      <PageHeader title="My learning" description="Track your progress and continue where you left off." />
      {isLoading ? <Loading /> : !data?.length ? (
        <EmptyState title="You haven't enrolled in any courses yet." action={<Button asChild><Link to="/courses">Browse courses</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <div key={e.id} className="flex flex-col rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-primary">{e.courses?.category}</p>
                <StatusBadge status={e.completed_at ? "completed" : e.completed > 0 ? "in_progress" : "not_started"} />
              </div>
              <h2 className="mt-2 flex-1 font-semibold">{e.courses?.title}</h2>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{e.completed}/{e.total} modules</span><span>{e.pct}%</span></div>
                <Progress value={e.pct} />
              </div>
              <Button asChild className="mt-4" size="sm"><Link to="/learn/$courseId" params={{ courseId: e.course_id }}>{e.completed ? "Continue learning" : "Start learning"}</Link></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
