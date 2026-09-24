import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { loading, profile, role, signOut } = useAuth();
  if (loading || !profile) return <Loading />;
  if (profile.account_status === "suspended") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Account suspended</h1>
          <p className="mt-2 text-muted-foreground">Your account has been suspended by an administrator. Please contact support.</p>
          <Button className="mt-6" variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }
  if (!role) return <Loading />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
