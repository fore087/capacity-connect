import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav } from "@/components/PublicNav";
import { Loading, fmtDate } from "@/components/common";

interface Verified { code: string; trainee_name: string; course_title: string; trainer_name: string | null; score: number | null; issued_at: string; portfolio_slug: string | null }

export const Route = createFileRoute("/verify/$code")({
  head: () => ({
    meta: [
      { title: "Verify certificate — Capacity Connect" },
      { name: "description", content: "Check that a Capacity Connect certificate is genuine." },
      { property: "og:title", content: "Verify certificate — Capacity Connect" },
      { property: "og:description", content: "Check that a Capacity Connect certificate is genuine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verify", code],
    queryFn: async () => ((await supabase.rpc("verify_certificate", { _code: code })).data ?? null) as Verified | null,
  });
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-xl px-4 py-16">
        {isLoading ? <Loading /> : data ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <BadgeCheck className="mx-auto h-14 w-14 text-primary" />
            <h1 className="mt-3 font-display text-2xl font-bold">Genuine certificate</h1>
            <p className="mt-1 text-muted-foreground">Issued by Capacity Connect</p>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <Row k="Awarded to" v={data.trainee_name} />
              <Row k="Course" v={data.course_title} />
              <Row k="Trainer" v={data.trainer_name ?? "—"} />
              {data.score != null && <Row k="Score" v={`${Number(data.score)}%`} />}
              <Row k="Completed" v={fmtDate(data.issued_at)} />
              <Row k="Certificate ID" v={data.code} />
            </dl>
            {data.portfolio_slug && (
              <Link to="/p/$slug" params={{ slug: data.portfolio_slug }} className="mt-6 inline-block font-medium text-primary hover:underline">
                View full portfolio →
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 font-display text-2xl font-bold">Certificate not found</h1>
            <p className="mt-1 text-muted-foreground">No certificate matches “{code}”. Check the ID and try again.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
