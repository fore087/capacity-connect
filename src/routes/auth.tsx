import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).optional(),
  role: z.enum(["trainee", "trainer"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or register — Capacity Connect" },
      { name: "description", content: "Sign in to Capacity Connect or register as a trainee or trainer." },
      { property: "og:title", content: "Sign in — Capacity Connect" },
      { property: "og:description", content: "Access your Capacity Connect portal." },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  role: z.enum(["trainee", "trainer"]),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState(search.mode ?? "login");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"trainee" | "trainer">(search.role ?? "trainee");
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!z.string().email().safeParse(email).success) { toast.error("Enter a valid email address"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard" });
  }

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      full_name: f.get("full_name"),
      email: f.get("email"),
      password: f.get("password"),
      role,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Invalid input"); return; }
    if (f.get("password") !== f.get("confirm")) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: parsed.data.full_name, role: parsed.data.role },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) setCheckEmail(true);
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-10 text-primary-foreground md:flex">
        <div className="[&_span]:text-primary-foreground"><Logo light /></div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Build Skills.<br />Build Capacity.<br />Build the Future.</h2>
          <p className="mt-4 max-w-sm text-primary-foreground/75">
            Trainees are activated right away. Trainer accounts are reviewed by an administrator before course tools unlock.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">© Capacity Connect</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden"><Logo /></div>
          {checkEmail ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-3 text-muted-foreground">
                We sent a confirmation link. Click it to activate your account, then sign in.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => { setCheckEmail(false); setTab("login"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={onLogin} className="mt-6 space-y-4">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <div className="space-y-2"><Label htmlFor="le">Email</Label><Input id="le" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-2"><Label htmlFor="lp">Password</Label><Input id="lp" name="password" type="password" required autoComplete="current-password" /></div>
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot your password?</Link>
                  </div>
                  <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={onRegister} className="mt-6 space-y-4">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as "trainee" | "trainer")} className="grid grid-cols-2 gap-3">
                    {(["trainee", "trainer"] as const).map((r) => (
                      <Label key={r} htmlFor={`r-${r}`} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-secondary">
                        <RadioGroupItem id={`r-${r}`} value={r} />
                        <span className="capitalize">I'm a {r}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                  {role === "trainer" && (
                    <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                      Trainer accounts need administrator approval before you can create courses.
                    </p>
                  )}
                  <div className="space-y-2"><Label htmlFor="rn">Full name</Label><Input id="rn" name="full_name" required maxLength={100} /></div>
                  <div className="space-y-2"><Label htmlFor="re">Email</Label><Input id="re" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-2">
                    <Label htmlFor="rp">Password</Label>
                    <Input id="rp" name="password" type="password" required autoComplete="new-password" />
                    <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>
                  </div>
                  <div className="space-y-2"><Label htmlFor="rc">Confirm password</Label><Input id="rc" name="confirm" type="password" required autoComplete="new-password" /></div>
                  <Button className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
