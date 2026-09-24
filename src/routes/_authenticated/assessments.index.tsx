import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatusBadge, fmtDate } from "@/components/common";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/assessments/")({
  head: () => ({ meta: [{ title: "Assessments — Capacity Connect" }] }),
  component: AssessmentsList,
});

function AssessmentsList() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-assessments", uid],
    queryFn: async () => {
      const [{ data: list }, { data: atts }] = await Promise.all([
        supabase.from("assessments").select("*, courses(title)").eq("published", true).order("created_at", { ascending: false }),
        supabase.from("assessment_attempts").select("*").eq("trainee_id", uid),
      ]);
      const map = new Map((atts ?? []).map((a) => [a.assessment_id, a]));
      return (list ?? []).map((a) => ({ ...a, att: map.get(a.id) }));
    },
  });
  const rows = data.filter((a) => `${a.title} ${a.courses?.title}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Assessments" description="MCQ assessments from your enrolled courses." />
      <Input placeholder="Search assessments…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 md:max-w-sm" />
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No assessments available." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((a) => (
            <Link key={a.id} to="/assessments/$assessmentId" params={{ assessmentId: a.id }} className="rounded-xl border bg-card p-5 hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs text-primary">{a.courses?.title}</p><h2 className="font-semibold">{a.title}</h2></div>
                {a.att?.submitted_at ? <StatusBadge status={a.att.passed ? "passed" : "failed"} /> : <StatusBadge status={a.att ? "in_progress" : "not_started"} />}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.duration_minutes} minutes · pass mark {a.passing_percentage}%</p>
              {a.deadline && <p className="text-xs text-muted-foreground">Closes {fmtDate(a.deadline, true)}</p>}
              {a.att?.submitted_at && <p className="mt-2 font-semibold">Score: {Number(a.att.percentage)}%</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
