import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, BadgeCheck, CalendarDays, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav } from "@/components/PublicNav";
import { EmptyState, Loading, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";

interface PortfolioCert { code: string; course_title: string; trainer_name: string | null; score: number | null; issued_at: string }
interface Portfolio {
  slug: string; headline: string | null; about: string | null; full_name: string;
  member_since: string; skills: string | null; certificates: PortfolioCert[];
}

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Proof of Capacity — ${params.slug} | Capacity Connect` },
      { name: "description", content: "Verified skills and certificates earned on Capacity Connect." },
      { property: "og:title", content: "Proof of Capacity Portfolio — Capacity Connect" },
      { property: "og:description", content: "Verified skills and certificates earned on Capacity Connect." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", slug],
    queryFn: async () => ((await supabase.rpc("get_public_portfolio", { _slug: slug })).data ?? null) as Portfolio | null,
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {isLoading ? <Loading /> : !data ? (
          <EmptyState title="Portfolio not found" description="This portfolio doesn't exist or is private." />
        ) : (
          <>
            <section className="rounded-2xl border bg-card p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground">
                    {data.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Proof of Capacity</p>
                    <h1 className="font-display text-3xl font-bold">{data.full_name}</h1>
                    {data.headline && <p className="text-muted-foreground">{data.headline}</p>}
                  </div>
                </div>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}>
                  <Share2 className="mr-2 h-4 w-4" />Share
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Verified certificates" value={data.certificates.length} />
                <Stat label="Average score" value={avg(data.certificates)} />
                <Stat label="Member since" value={fmtDate(data.member_since)} />
              </div>
              {data.about && <p className="mt-6 whitespace-pre-line leading-relaxed">{data.about}</p>}
              {data.skills && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {data.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">{s}</span>
                  ))}
                </div>
              )}
            </section>

            <h2 className="mb-4 mt-10 font-display text-xl font-bold">Verified achievements</h2>
            {data.certificates.length === 0 ? (
              <EmptyState title="No certificates yet" description="Completed courses will appear here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.certificates.map((c) => (
                  <div key={c.code} className="rounded-xl border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <Award className="h-8 w-8 shrink-0 text-accent" />
                      <div className="flex-1">
                        <p className="font-semibold">{c.course_title}</p>
                        {c.trainer_name && <p className="text-sm text-muted-foreground">Trainer: {c.trainer_name}</p>}
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(c.issued_at)}{c.score != null && ` · ${Number(c.score)}%`}</p>
                        <Link to="/verify/$code" params={{ code: c.code }} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                          <BadgeCheck className="h-4 w-4" />Verify {c.code}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function avg(certs: PortfolioCert[]) {
  const s = certs.filter((c) => c.score != null);
  return s.length ? `${Math.round(s.reduce((a, c) => a + Number(c.score), 0) / s.length)}%` : "—";
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
