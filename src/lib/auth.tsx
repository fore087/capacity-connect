import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  /** The main role used to pick the dashboard: admin > trainer > trainee */
  role: Role | null;
  isApprovedTrainer: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        // defer DB calls out of the auth callback
        setTimeout(() => loadUser(s), 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUser(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUser]);

  const role: Role | null = roles.includes("admin")
    ? "admin"
    : roles.includes("trainer")
      ? "trainer"
      : roles.includes("trainee")
        ? "trainee"
        : null;

  const value: AuthState = {
    loading,
    session,
    profile,
    roles,
    role,
    isApprovedTrainer:
      roles.includes("trainer") && profile?.trainer_status === "approved" && profile?.account_status === "active",
    refresh: () => loadUser(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
