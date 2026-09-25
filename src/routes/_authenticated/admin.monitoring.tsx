import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { levelName } from "@/lib/competency";
import { EmptyState, Loading, PageHeader, StatusBadge, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/monitoring")({
  head: () => ({ meta: [{ title: "Platform monitoring — Capacity Connect admin" }] }),
  component: Monitoring,
});

const TABS = ["enrolments", "assessments", "assignments", "certificates", "trainer competencies"] as const;
type Tab = (typeof TABS)[number];

/** Admin-only read-only view of real platform activity. Access is enforced by database rules. */
function Monitoring() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>("enrolments");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-monitoring"],
    enabled: role === "admin",
    queryFn: async () => {
      const [p, c, e, a, at, as, sub, cert, comp, tc] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, trainer_status, user_roles(role)"),
        supabase.from("courses").select("id, title"),
        supabase.from("enrollments").select("*").order("enrolled_at", { ascending: false }),
        supabase.from("assessments").select("id, title, course_id, published, passing_percentage"),
        supabase.from("assessment_attempts").select("*").order("started_at", { ascending: false }),
        supabase.from("assignments").select("id, title, course_id, deadline, max_marks"),
        supabase.from("assignment_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("certificates").select("*").order("issued_at", { ascending: false }),
        supabase.from("competencies").select("id, name"),
        supabase.from("trainer_competencies").select("*"),
      ]);
      return {
        people: p.data ?? [], courses: c.data ?? [], enrollments: e.data ?? [], assessments: a.data ?? [],
        attempts: at.data ?? [], assignments: as.data ?? [], submissions: sub.data ?? [], certificates: cert.data ?? [],
        comps: comp.data ?? [], tcs: tc.data ?? [],
      };
    },
  });
  if (role !== "admin") return <EmptyState title="Administrators only." />;
  if (isLoading || !data) return <Loading />;

  const name = (id: string | null) => data.people.find((x) => x.id === id)?.full_name ?? "—";
  const course = (id: string) => data.courses.find((x) => x.id === id)?.title ?? "—";
  const enrolled = (courseId: string) => data.enrollments.filter((x) => x.course_id === courseId).length;
  const trainers = data.people.filter((x) => (x.user_roles ?? []).some((r) => r.role === "trainer"));

  return (
    <div>
      <PageHeader title="Platform monitoring" description="Live enrolments, assessment results, assignment participation, certificates and trainer competency profiles." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="capitalize" onClick={() => setTab(t)}>{t}</Button>)}
      </div>

      {tab === "enrolments" && (data.enrollments.length === 0 ? <EmptyState title="No enrolments yet." description="Enrolments appear here when trainees join published courses." /> : (
        <Table head={["Trainee", "Course", "Enrolled", "Status"]}>
          {data.enrollments.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{name(r.trainee_id)}</td><td className="p-3">{course(r.course_id)}</td><td className="p-3">{fmtDate(r.enrolled_at)}</td><td className="p-3"><StatusBadge status={r.completed_at ? "completed" : "in_progress"} /></td></tr>)}
        </Table>
      ))}

      {tab === "assessments" && (data.assessments.length === 0 ? <EmptyState title="No assessments yet." /> : (
        <Table head={["Assessment", "Course", "Status", "Attempts", "Passed", "Average"]}>
          {data.assessments.map((a) => {
            const done = data.attempts.filter((x) => x.assessment_id === a.id && x.submitted_at);
            const avg = done.length ? Math.round(done.reduce((s, x) => s + Number(x.percentage ?? 0), 0) / done.length) : 0;
            return <tr key={a.id} className="border-t"><td className="p-3 font-medium">{a.title}</td><td className="p-3">{course(a.course_id)}</td><td className="p-3"><StatusBadge status={a.published ? "published" : "draft"} /></td><td className="p-3">{done.length}</td><td className="p-3">{done.filter((x) => x.passed).length}</td><td className="p-3">{avg}%</td></tr>;
          })}
        </Table>
      ))}

      {tab === "assignments" && (data.assignments.length === 0 ? <EmptyState title="No assignments yet." /> : (
        <Table head={["Assignment", "Course", "Deadline", "Participation", "Evaluated", "Late"]}>
          {data.assignments.map((a) => {
            const subs = data.submissions.filter((x) => x.assignment_id === a.id && x.status !== "in_progress");
            return <tr key={a.id} className="border-t"><td className="p-3 font-medium">{a.title}</td><td className="p-3">{course(a.course_id)}</td><td className="p-3">{fmtDate(a.deadline, true)}</td><td className="p-3">{subs.length} / {enrolled(a.course_id)}</td><td className="p-3">{subs.filter((x) => x.status === "evaluated").length}</td><td className="p-3">{subs.filter((x) => x.status === "late").length}</td></tr>;
          })}
        </Table>
      ))}

      {tab === "certificates" && (data.certificates.length === 0 ? <EmptyState title="No certificates issued yet." /> : (
        <Table head={["Code", "Trainee", "Course", "Score", "Issued"]}>
          {data.certificates.map((c) => <tr key={c.id} className="border-t"><td className="p-3 font-mono text-xs">{c.certificate_code}</td><td className="p-3">{c.trainee_name}</td><td className="p-3">{c.course_title}</td><td className="p-3">{c.score ?? "—"}</td><td className="p-3">{fmtDate(c.issued_at)}</td></tr>)}
        </Table>
      ))}

      {tab === "trainer competencies" && (trainers.length === 0 ? <EmptyState title="No trainers registered yet." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {trainers.map((t) => {
            const mine = data.tcs.filter((x) => x.trainer_id === t.id);
            return (
              <div key={t.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center gap-2"><p className="flex-1 font-semibold">{t.full_name}</p><StatusBadge status={t.trainer_status} /></div>
                {mine.length === 0 ? <p className="text-sm text-muted-foreground">No competencies recorded yet.</p> : (
                  <ul className="flex flex-wrap gap-2">{mine.map((m) => <li key={m.id} className="rounded-full bg-secondary px-3 py-1 text-sm">{data.comps.find((c) => c.id === m.competency_id)?.name} — {levelName(m.level)}</li>)}</ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground"><tr>{head.map((h) => <th key={h} className="p-3 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
