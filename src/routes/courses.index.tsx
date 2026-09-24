import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicFooter, PublicNav } from "@/components/PublicNav";
import { EmptyState, Loading } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Browse courses — Capacity Connect" },
      { name: "description", content: "Search and filter published training courses on Capacity Connect." },
      { property: "og:title", content: "Courses — Capacity Connect" },
      { property: "og:description", content: "Find a course and start building your skills." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [diff, setDiff] = useState("all");
  const { data: courses, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,description,category,difficulty,duration,skills,trainer_id, course_modules(count)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const trainerIds = useMemo(() => [...new Set((courses ?? []).map((c) => c.trainer_id))], [courses]);
  const { data: trainers = [] } = useQuery({
    queryKey: ["trainer-info", trainerIds],
    enabled: trainerIds.length > 0,
    queryFn: async () => (await supabase.rpc("trainer_public_info", { _ids: trainerIds })).data ?? [],
  });
  const tname = (id: string) => trainers.find((t) => t.id === id)?.full_name ?? "";

  const categories = [...new Set((courses ?? []).map((c) => c.category))].sort();
  const filtered = (courses ?? []).filter(
    (c) =>
      (cat === "all" || c.category === cat) &&
      (diff === "all" || c.difficulty === diff) &&
      (q === "" || `${c.title} ${c.description} ${c.skills ?? ""} ${tname(c.trainer_id)}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">Course catalogue</h1>
        <p className="mt-1 text-muted-foreground">Published courses from approved trainers.</p>
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title, skill or trainer…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={diff} onValueChange={setDiff}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-8">
          {isLoading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <EmptyState title="No courses available yet." description={courses?.length ? "Try a different search or filter." : undefined} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Link key={c.id} to="/courses/$courseId" params={{ courseId: c.id }} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c.category}</Badge>
                    <Badge variant="outline" className="capitalize">{c.difficulty}</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{c.title}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                    <span>{tname(c.trainer_id) || "Trainer"}</span>
                    <span>{(c.course_modules as unknown as { count: number }[])[0]?.count ?? 0} modules{c.duration ? ` · ${c.duration}` : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
