import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, BookOpen, ClipboardCheck, Megaphone, Network, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicFooter, PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { EmptyState, fmtDate } from "@/components/common";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capacity Connect — Build Skills. Build Capacity. Build the Future." },
      { name: "description", content: "Training platform connecting trainees, trainers and administrators: courses, assignments, assessments and certificates." },
      { property: "og:title", content: "Capacity Connect" },
      { property: "og:description", content: "Build Skills. Build Capacity. Build the Future." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["public-announcements"],
    queryFn: async () =>
      (await supabase.from("announcements").select("*").order("publish_at", { ascending: false }).limit(6)).data ?? [],
  });
  const { data: achievements = [] } = useQuery({
    queryKey: ["public-achievements"],
    queryFn: async () =>
      (await supabase.from("achievements").select("*").order("achieved_on", { ascending: false }).limit(6)).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () =>
      (await supabase.from("courses").select("id,title,category,difficulty,description").eq("status", "published").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Capacity Connect</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Build Skills. Build Capacity. Build the Future.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-primary-foreground/80">
              One place for trainees to learn, trainers to teach and assess, and administrators to grow real capability across the organisation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth" search={{ mode: "register" }}>
                  Join as a trainee <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/auth" search={{ mode: "register", role: "trainer" }}>Apply as a trainer</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 self-center">
            {[
              { icon: <BookOpen />, t: "Structured courses", d: "Modules, resources and progress tracking" },
              { icon: <ClipboardCheck />, t: "Real assessments", d: "Auto-graded MCQs and marked assignments" },
              { icon: <Award />, t: "Certificates", d: "Issued only on verified completion" },
              { icon: <Network />, t: "Competency matching", d: "Right trainer for every subject" },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5">
                <span className="text-accent">{f.icon}</span>
                <p className="mt-3 font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-primary-foreground/70">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Megaphone className="h-6 w-6 text-primary" /> Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <EmptyState title="No announcements yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {announcements.map((a) => (
              <article key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{a.category}</p>
                <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{fmtDate(a.publish_at)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-secondary/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Latest courses</h2>
            <Link to="/courses" className="text-sm font-semibold text-primary hover:underline">View all courses →</Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState title="No courses available yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {courses.map((c) => (
                <Link key={c.id} to="/courses/$courseId" params={{ courseId: c.id }} className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md">
                  <p className="text-xs font-semibold uppercase text-primary">{c.category} · {c.difficulty}</p>
                  <h3 className="mt-2 font-semibold">{c.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-accent" /> Our achievements</h2>
        {achievements.length === 0 ? (
          <EmptyState title="No achievements published yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {achievements.map((a) => (
              <article key={a.id} className="rounded-xl border-l-4 border-l-accent bg-card p-5 shadow-sm">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
                {a.achieved_on && <p className="mt-3 text-xs text-muted-foreground">{fmtDate(a.achieved_on)}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            { icon: <Users />, t: "Trainees", d: "Enrol, learn, submit work, take assessments and earn certificates." },
            { icon: <BookOpen />, t: "Trainers", d: "Create courses, share resources, set assignments and evaluate." },
            { icon: <Network />, t: "Administrators", d: "Approve trainers, oversee courses and match competencies." },
          ].map((r) => (
            <div key={r.t}>
              <span className="text-accent">{r.icon}</span>
              <p className="mt-2 text-lg font-semibold">{r.t}</p>
              <p className="mt-1 text-sm text-primary-foreground/75">{r.d}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
