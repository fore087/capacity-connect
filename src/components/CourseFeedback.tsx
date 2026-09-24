import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Loading, fmtDate } from "@/components/common";

export function FeedbackTab({ courseId }: { courseId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["course-feedback", courseId],
    queryFn: async () => (await supabase.from("feedback").select("*").eq("course_id", courseId).order("created_at", { ascending: false })).data ?? [],
  });
  if (isLoading) return <Loading />;
  if (!data.length) return <EmptyState title="No feedback yet." />;
  const avg = (data.reduce((a, b) => a + b.rating, 0) / data.length).toFixed(1);
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 font-semibold"><Star className="h-5 w-5 fill-accent text-accent" />{avg} average from {data.length} review(s)</p>
      {data.map((f) => (
        <div key={f.id} className="rounded-xl border bg-card p-4">
          <p className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={n <= f.rating ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-muted-foreground"} />)}</p>
          {f.comments && <p className="mt-2 text-sm">{f.comments}</p>}
          {f.resource_feedback && <p className="mt-1 text-sm text-muted-foreground">Resources: {f.resource_feedback}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{fmtDate(f.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
