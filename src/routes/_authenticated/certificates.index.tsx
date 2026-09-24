import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, fmtDate } from "@/components/common";

export const Route = createFileRoute("/_authenticated/certificates/")({
  head: () => ({ meta: [{ title: "Certificates — Capacity Connect" }] }),
  component: Certificates,
});

function Certificates() {
  const { session } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-certs", session?.user.id],
    queryFn: async () => (await supabase.from("certificates").select("*").eq("trainee_id", session!.user.id).order("issued_at", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="My certificates" description="Earned by completing every requirement of a course." />
      {isLoading ? <Loading /> : data.length === 0 ? <EmptyState title="No certificates yet." description="Complete all modules, assignments and assessments in a course to earn one." /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Link key={c.id} to="/certificates/$certificateId" params={{ certificateId: c.id }} className="rounded-xl border bg-card p-5 hover:shadow-md">
              <Award className="h-8 w-8 text-accent" />
              <h2 className="mt-3 font-semibold">{c.course_title}</h2>
              <p className="text-sm text-muted-foreground">Issued {fmtDate(c.issued_at)}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{c.certificate_code}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
