import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Capacity Connect" },
      { name: "description", content: "Request a password reset link for your Capacity Connect account." },
      { property: "og:title", content: "Forgot password — Capacity Connect" },
      { property: "og:description", content: "Request a password reset link for your Capacity Connect account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!z.string().email().safeParse(email).success) { toast.error("Enter a valid email address"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8"><Logo /></div>
        <div className="rounded-xl border bg-card p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-3 text-muted-foreground">
                If an account exists for that email, we sent a password reset link. Click it to choose a new password.
              </p>
              <Button asChild className="mt-6" variant="outline"><Link to="/auth">Back to sign in</Link></Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                Enter the email you registered with and we'll send you a reset link.
              </p>
              <div className="space-y-2"><Label htmlFor="fp-email">Email</Label><Input id="fp-email" name="email" type="email" required autoComplete="email" /></div>
              <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
              <p className="text-center text-sm">
                <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
