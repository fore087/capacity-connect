import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Loading, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/certificates/$certificateId")({
  head: () => ({ meta: [{ title: "Certificate — Capacity Connect" }] }),
  component: CertificateView,
});

function CertificateView() {
  const { certificateId } = Route.useParams();
  const { data: c, isLoading } = useQuery({
    queryKey: ["certificate", certificateId],
    queryFn: async () => (await supabase.from("certificates").select("*").eq("id", certificateId).maybeSingle()).data,
  });
  if (isLoading) return <Loading />;
  if (!c) return <EmptyState title="Certificate not found" />;

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save as PDF</Button>
      </div>
      <div className="mx-auto aspect-[1.414/1] max-w-4xl rounded-lg border-[10px] border-double border-primary bg-card p-10 text-center shadow-lg print:shadow-none">
        <div className="flex h-full flex-col items-center justify-between">
          <div>
            <Award className="mx-auto h-14 w-14 text-accent" />
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Capacity Connect</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold text-foreground md:text-5xl">Certificate of Completion</h1>
          </div>
          <div>
            <p className="text-muted-foreground">This is to certify that</p>
            <p className="mt-2 font-display text-3xl font-bold text-primary md:text-4xl">{c.trainee_name}</p>
            <p className="mt-4 text-muted-foreground">has successfully completed the course</p>
            <p className="mt-2 text-2xl font-semibold">{c.course_title}</p>
            {c.score != null && <p className="mt-2 text-muted-foreground">with an average assessment score of <strong>{Number(c.score)}%</strong></p>}
          </div>
          <div className="grid w-full grid-cols-3 items-end gap-4 text-sm">
            <div><p className="border-t pt-2 font-semibold">{c.trainer_name ?? "—"}</p><p className="text-muted-foreground">Course trainer</p></div>
            <div><p className="font-semibold">{fmtDate(c.issued_at)}</p><p className="text-muted-foreground">Completion date</p></div>
            <div><p className="border-t pt-2 font-mono font-semibold">{c.certificate_code}</p><p className="text-muted-foreground">Certificate ID</p></div>
          </div>
          <p className="text-xs italic text-muted-foreground">Issued by Capacity Connect — Build Skills. Build Capacity. Build the Future.</p>
        </div>
      </div>
    </div>
  );
}
