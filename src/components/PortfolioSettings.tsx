import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** Lets a trainee turn on a public "Proof of Capacity" page at /p/<slug>. */
export function PortfolioSettings({ uid, fullName }: { uid: string; fullName: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-portfolio", uid],
    queryFn: async () => (await supabase.from("portfolios").select("*").eq("user_id", uid).maybeSingle()).data,
  });
  const [slug, setSlug] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    if (isLoading) return;
    setSlug(data?.slug ?? toSlug(fullName));
    setIsPublic(data?.is_public ?? false);
    setHeadline(data?.headline ?? "");
    setAbout(data?.about ?? "");
  }, [data, isLoading, fullName]);

  async function save() {
    const clean = toSlug(slug);
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(clean)) { toast.error("Link name must be 3–40 letters, numbers or dashes"); return; }
    const { error } = await supabase.from("portfolios").upsert({
      user_id: uid, slug: clean, is_public: isPublic, headline: headline.trim() || null, about: about.trim() || null, updated_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.code === "23505" ? "That link name is taken — try another" : errMsg(error)); return; }
    setSlug(clean);
    toast.success("Portfolio saved");
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  if (isLoading) return null;
  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Proof of Capacity portfolio</h2>
          <p className="text-sm text-muted-foreground">A public page showing your verified certificates and skills. Share it with employers. Your email and phone are never shown.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><Switch checked={isPublic} onCheckedChange={setIsPublic} />{isPublic ? "Public" : "Private"}</label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Link name</Label>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">/p/<Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={40} /></div>
        </div>
        <div className="space-y-2"><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} placeholder="e.g. Aspiring data analyst" /></div>
        <div className="space-y-2 md:col-span-2"><Label>About me</Label><Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} maxLength={2000} /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={save}>Save portfolio</Button>
        {data?.is_public && (
          <Link to="/p/$slug" params={{ slug: data.slug }} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View public page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
