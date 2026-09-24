import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award, BookOpen, CheckCircle2, ClipboardCheck, Clock, FileText, GraduationCap, Library, TrendingUp, UserCheck, Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Capacity Connect" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { role } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "trainer") return <TrainerDashboard />;
  return <TraineeDashboard />;
}

/* ---------------- TRAINEE ---------------- */
function TraineeDashboard() {
  const { profile, session } = useAuth();
  const uid = session!.user.id;
  const { data, isLoading } = useQuery({
    queryKey: ["trainee-dash", uid],
    queryFn: async () => {
      const [enr, subs, certs, asg, att] = await Promise.all([
        supabase.from("enrollments").select("id, completed_at, course_id, courses(title)").eq("trainee_id", uid),
        supabase.from("assignment_submissions").select("assignment_id,status").eq("trainee_id", uid),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("trainee_id", uid),
        supabase.from("assignments").select("id,title,deadline,course_id").gte("deadline", new Date().toISOString()).order("deadline").limit(20),
        supabase.from("assessment_attempts").select("percentage").eq("trainee_id", uid).not("submitted_at", "is", null),
      ]);
      const submitted = new Set((subs.data ?? []).filter((s) => s.status !== "in_progress").map((s) => s.assignment_id));
      const upcoming = (asg.data ?? []).filter((a) => !submitted.has(a.id));
      const pcts = (att.data ?? []).map((a) => Number(a.percentage ?? 0));
      return {
        enrollments: enr.data ?? [],
        completed: (enr.data ?? []).filter((e) => e.completed_at).length,
        upcoming,
        certificates: certs.count ?? 0,
        avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      };
    },
  });
  if (isLoading || !data) return <Loading />;
  const soon = data.upcoming.filter((a) => new Date(a.deadline).getTime() - Date.now() < 48 * 3600 * 1000);

  return (
    <div>
      <PageHeader title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? ""}`} description="Your learning at a glance." actions={<Button asChild><Link to="/courses">Browse courses</Link></Button>} />
      {soon.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning bg-warning/15 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> Deadline approaching</p>
          <ul className="mt-1 list-disc pl-6">
            {soon.map((a) => <li key={a.id}><Link to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="underline">{a.title}</Link> — due {fmtDate(a.deadline, true)}</li>)}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled courses" value={data.enrollments.length} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Completed courses" value={data.completed} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Pending assignments" value={data.upcoming.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Certificates" value={data.certificates} icon={<Award className="h-5 w-5" />} hint={`Average assessment score: ${data.avg}%`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">My courses</h2>
          {data.enrollments.length === 0 ? (
            <EmptyState title="You haven't enrolled in any courses yet." action={<Button asChild size="sm"><Link to="/courses">Find a course</Link></Button>} />
          ) : (
            <ul className="divide-y">
              {data.enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <Link to="/learn/$courseId" params={{ courseId: e.course_id }} className="font-medium hover:text-primary">{e.courses?.title}</Link>
                  <StatusBadge status={e.completed_at ? "completed" : "in_progress"} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">Upcoming deadlines</h2>
          {data.upcoming.length === 0 ? (
            <EmptyState title="Nothing due right now." />
          ) : (
            <ul className="divide-y">
              {data.upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <Link to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="font-medium hover:text-primary">{a.title}</Link>
                  <span className="text-sm text-muted-foreground">{fmtDate(a.deadline, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- TRAINER ---------------- */
function TrainerDashboard() {
  const { profile, isApprovedTrainer } = useAuth();
  const { data: s, isLoading } = useQuery({
    queryKey: ["trainer-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trainer_stats");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  return (
    <div>
      <PageHeader title="Trainer dashboard" description={`Welcome, ${profile?.full_name ?? ""}`} actions={isApprovedTrainer ? <Button asChild><Link to="/teach">Manage courses</Link></Button> : undefined} />
      {!isApprovedTrainer && (
        <div className="mb-6 rounded-xl border bg-secondary p-5">
          <p className="font-semibold">Your trainer account is <StatusBadge status={profile?.trainer_status} /></p>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.trainer_status === "pending"
              ? "An administrator will review your application. Meanwhile, complete your professional profile and competencies — it helps with approval."
              : "Course management tools are unavailable. Please contact an administrator."}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/profile">Complete profile</Link></Button>
        </div>
      )}
      {isLoading || !s ? <Loading /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Courses created" value={s.courses} icon={<GraduationCap className="h-5 w-5" />} />
          <StatCard label="Active (published)" value={s.active_courses} icon={<BookOpen className="h-5 w-5" />} />
          <StatCard label="Enrolled trainees" value={s.trainees} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Pending submissions" value={s.pending_submissions} icon={<FileText className="h-5 w-5" />} />
          <StatCard label="Assessments" value={s.assessments} icon={<ClipboardCheck className="h-5 w-5" />} />
          <StatCard label="Resources" value={s.resources} icon={<Library className="h-5 w-5" />} />
          <StatCard label="Avg. trainee performance" value={`${s.avg_performance ?? 0}%`} icon={<TrendingUp className="h-5 w-5" />} hint="Across submitted assessments" />
        </div>
      )}
      {isApprovedTrainer && (s?.pending_submissions ?? 0) > 0 && (
        <Button asChild className="mt-6"><Link to="/teach/submissions">Review {s!.pending_submissions} pending submission(s)</Link></Button>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
type AdminStats = Record<string, number> & {
  enrollments_by_month: { month: string; count: number }[];
  courses_by_category: { category: string; count: number }[];
};
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AdminDashboard() {
  const { data: s, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });
  if (isLoading || !s) return <Loading />;
  const roleData = [
    { name: "Trainees", value: s.trainees },
    { name: "Trainers", value: s.trainers },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader title="Administration dashboard" description="Live figures from the platform database." />
      {s.pending_trainers > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning/15 p-4">
          <p className="font-medium">{s.pending_trainers} trainer application(s) awaiting approval.</p>
          <Button asChild size="sm"><Link to="/admin/users" search={{ filter: "pending" }}>Review now</Link></Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={s.total_users} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Trainees" value={s.trainees} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Trainers" value={s.trainers} icon={<UserCheck className="h-5 w-5" />} hint={`${s.pending_trainers} pending`} />
        <StatCard label="Courses" value={s.courses} icon={<BookOpen className="h-5 w-5" />} hint={`${s.published_courses} published`} />
        <StatCard label="Enrolments" value={s.enrollments} icon={<Library className="h-5 w-5" />} hint={`${s.active_learners} active learners`} />
        <StatCard label="Assessments" value={s.assessments} icon={<ClipboardCheck className="h-5 w-5" />} hint={`${s.attempts} attempts`} />
        <StatCard label="Assignment submissions" value={s.submissions} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Certificates issued" value={s.certificates} icon={<Award className="h-5 w-5" />} hint={`Completion rate ${s.completion_rate}%`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Enrolments per month</h2>
          {s.enrollments_by_month.length === 0 ? <EmptyState title="No enrolments yet." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={s.enrollments_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Enrolments" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">Users by role</h2>
          {roleData.length === 0 ? <EmptyState title="No users yet." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {roleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % 5]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5 lg:col-span-3">
          <h2 className="mb-4 font-semibold">Courses by category</h2>
          {s.courses_by_category.length === 0 ? <EmptyState title="No courses yet." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={s.courses_by_category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="category" width={140} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Courses" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}
