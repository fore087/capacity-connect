import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/PublicNav";
import { errMsg } from "@/components/common";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Initial administrator setup — Capacity Connect" },
      { name: "description", content: "One-time setup to create the first Capacity Connect administrator." },
      { property: "og:title", content: "Setup — Capacity Connect" },
      { property: "og:description", content: "One-time administrator setup." },
    ],
  }),
  component: Setup,
});

function Setup() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: exists, isLoading } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });

  async function claim() {
    setBusy(true);
    const { error } = await supabase.rpc("claim_first_admin");
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    await refresh();
    toast.success("You are now the platform administrator");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-lg px-4 py-20">
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Initial administrator setup</h1>
          {isLoading ? (
            <p className="mt-3 text-muted-foreground">Checking…</p>
          ) : exists ? (
            <p className="mt-3 text-muted-foreground">
              Setup is complete — an administrator already exists. This page is now disabled.
            </p>
          ) : !session ? (
            <>
              <p className="mt-3 text-muted-foreground">
                No administrator exists yet. Register and confirm an account first, sign in, then return to this page to become the first administrator.
              </p>
              <Button asChild className="mt-6"><Link to="/auth" search={{ mode: "register" }}>Register / sign in</Link></Button>
            </>
          ) : (
            <>
              <p className="mt-3 text-muted-foreground">
                No administrator exists yet. The signed-in account will become the platform administrator. This can only be done once.
              </p>
              <Button className="mt-6" onClick={claim} disabled={busy}>{busy ? "Setting up…" : "Make me the administrator"}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
