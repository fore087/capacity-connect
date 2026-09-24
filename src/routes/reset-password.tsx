import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Capacity Connect" },
      { name: "description", content: "Set a new password for your Capacity Connect account." },
      { property: "og:title", content: "Choose a new password — Capacity Connect" },
      { property: "og:description", content: "Set a new password for your Capacity Connect account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The reset link arrives with type=recovery in the URL hash; Supabase
    // exchanges it for a recovery session and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If the session was already established before this component mounted:
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const timer = setTimeout(() => setInvalid(true), 8000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must be 8+ characters with uppercase, lowercase and a number");
      return;
    }
    if (password !== f.get("confirm")) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated — you're signed in");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8"><Logo /></div>
        <div className="rounded-xl border bg-card p-8">
          {ready ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <h1 className="text-2xl font-bold">Choose a new password</h1>
              <div className="space-y-2">
                <Label htmlFor="np">New password</Label>
                <Input id="np" name="password" type="password" required autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>
              </div>
              <div className="space-y-2"><Label htmlFor="npc">Confirm new password</Label><Input id="npc" name="confirm" type="password" required autoComplete="new-password" /></div>
              <Button className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
            </form>
          ) : invalid ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold">Link expired or invalid</h1>
              <p className="mt-3 text-muted-foreground">Password reset links only work once and expire after a while. Request a fresh one.</p>
              <Button asChild className="mt-6"><Link to="/forgot-password">Request a new link</Link></Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Verifying your reset link…</p>
          )}
        </div>
      </div>
    </div>
  );
}
