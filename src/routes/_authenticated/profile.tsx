import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadFile, validateFile } from "@/lib/files";
import { LEVELS, levelName } from "@/lib/competency";
import { PageHeader, StatusBadge, errMsg } from "@/components/common";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — Capacity Connect" }] }),
  component: ProfilePage,
});

const basicSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(100),
  phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/, "Phone may only contain digits, spaces and + ( ) -"),
});

function ProfilePage() {
  const { profile, role, refresh, session } = useAuth();
  const uid = session!.user.id;
  const [busy, setBusy] = useState(false);

  async function saveBasic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = basicSchema.safeParse({ full_name: f.get("full_name"), phone: f.get("phone") ?? "" });
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null }).eq("id", uid);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Profile saved");
    refresh();
  }

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    const err = validateFile(file, "avatars", ["png", "jpg", "jpeg", "webp", "gif"]);
    if (err) { toast.error(err); return; }
    try {
      const path = await uploadFile("avatars", uid, file);
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", uid);
      toast.success("Photo updated");
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="My profile" description="Only you, administrators and (for trainees) your course trainers can see your personal details." />
      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar path={profile?.avatar_url} name={profile?.full_name ?? ""} size={80} />
          <div className="flex-1">
            <p className="text-lg font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-1 flex gap-2"><StatusBadge status={role} />{role === "trainer" && <StatusBadge status={profile?.trainer_status} />}</div>
          </div>
          <Label className="cursor-pointer">
            <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"><Upload className="mr-2 h-4 w-4" />Change photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </Label>
        </div>
        <form onSubmit={saveBasic} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Full name</Label><Input name="full_name" defaultValue={profile?.full_name} required /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={profile?.email ?? ""} disabled /></div>
          <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={profile?.phone ?? ""} /></div>
          <div className="flex items-end"><Button disabled={busy}>Save details</Button></div>
        </form>
      </section>
      {role === "trainee" && <TraineeDetails uid={uid} />}
      {role === "trainer" && <><TrainerDetails uid={uid} /><TrainerCompetencies uid={uid} /></>}
    </div>
  );
}

function useProfileForm<T extends Record<string, unknown>>(table: "trainee_profiles" | "trainer_profiles", uid: string) {
  return useQuery({
    queryKey: [table, uid],
    queryFn: async () => ((await supabase.from(table).select("*").eq("user_id", uid).maybeSingle()).data ?? {}) as T,
  });
}

function Field({ name, label, value, area }: { name: string; label: string; value: unknown; area?: boolean }) {
  return (
    <div className={area ? "space-y-2 md:col-span-2" : "space-y-2"}>
      <Label>{label}</Label>
      {area ? <Textarea name={name} defaultValue={(value as string) ?? ""} rows={3} maxLength={2000} /> : <Input name={name} defaultValue={(value as string) ?? ""} maxLength={300} />}
    </div>
  );
}

function TraineeDetails({ uid }: { uid: string }) {
  const { data } = useProfileForm<Record<string, string | null>>("trainee_profiles", uid);
  const qc = useQueryClient();
  if (!data) return null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const { error } = await supabase.from("trainee_profiles").upsert({ user_id: uid, ...f, updated_at: new Date().toISOString() });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Learning profile saved");
    qc.invalidateQueries({ queryKey: ["trainee_profiles"] });
  }
  return (
    <form onSubmit={save} className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Learning profile</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="qualifications" label="Qualifications" value={data.qualifications} />
        <Field name="education" label="Educational background" value={data.education} />
        <Field name="skills" label="Skills (comma separated)" value={data.skills} />
        <Field name="interests" label="Interests" value={data.interests} />
        <Field name="areas_of_interest" label="Areas of interest" value={data.areas_of_interest} />
        <Field name="address" label="Address (optional)" value={data.address} />
        <Field name="work_experience" label="Work experience" value={data.work_experience} area />
        <Field name="certificates" label="Certificates held" value={data.certificates} area />
        <Field name="bio" label="Professional bio" value={data.bio} area />
      </div>
      <Button className="mt-4">Save learning profile</Button>
    </form>
  );
}

function TrainerDetails({ uid }: { uid: string }) {
  const { data } = useProfileForm<Record<string, string | number | null>>("trainer_profiles", uid);
  const qc = useQueryClient();
  if (!data) return null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const years = Number(f.experience_years || 0);
    if (Number.isNaN(years) || years < 0 || years > 70) { toast.error("Enter valid years of experience"); return; }
    const { error } = await supabase.from("trainer_profiles").upsert({ user_id: uid, ...f, experience_years: years, updated_at: new Date().toISOString() });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Professional profile saved");
    qc.invalidateQueries({ queryKey: ["trainer_profiles"] });
  }
  return (
    <form onSubmit={save} className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Professional profile</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="qualification" label="Qualification" value={data.qualification} />
        <Field name="specialization" label="Specialisation" value={data.specialization} />
        <div className="space-y-2"><Label>Years of experience</Label><Input name="experience_years" type="number" min={0} max={70} defaultValue={String(data.experience_years ?? 0)} /></div>
        <Field name="subjects_taught" label="Subjects taught" value={data.subjects_taught} />
        <Field name="skills" label="Skills (comma separated)" value={data.skills} />
        <Field name="certifications" label="Certifications" value={data.certifications} />
        <Field name="experience" label="Experience summary" value={data.experience} area />
        <Field name="bio" label="Professional bio (shown on your courses)" value={data.bio} area />
      </div>
      <Button className="mt-4">Save professional profile</Button>
    </form>
  );
}

function TrainerCompetencies({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const [comp, setComp] = useState("");
  const [level, setLevel] = useState("3");
  const { data: all = [] } = useQuery({ queryKey: ["competencies"], queryFn: async () => (await supabase.from("competencies").select("*").order("name")).data ?? [] });
  const { data: mine = [] } = useQuery({
    queryKey: ["my-competencies", uid],
    queryFn: async () => (await supabase.from("trainer_competencies").select("id, level, competency_id, competencies(name)").eq("trainer_id", uid)).data ?? [],
  });
  useEffect(() => { if (!comp && all[0]) setComp(all[0].id); }, [all, comp]);

  async function add() {
    if (!comp) return;
    const { error } = await supabase.from("trainer_competencies").upsert({ trainer_id: uid, competency_id: comp, level: Number(level) }, { onConflict: "trainer_id,competency_id" });
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["my-competencies"] });
  }
  async function remove(id: string) {
    await supabase.from("trainer_competencies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-competencies"] });
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Competency levels</h2>
      <p className="mb-4 text-sm text-muted-foreground">Used by the Competency Matching Engine to match you with training subjects. Competencies are defined by administrators.</p>
      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competencies have been defined by an administrator yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Select value={comp} onValueChange={setComp}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Competency" /></SelectTrigger>
            <SelectContent>{all.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4].map((l) => <SelectItem key={l} value={String(l)}>{LEVELS[l]}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Add / update</Button>
        </div>
      )}
      <ul className="mt-4 divide-y">
        {mine.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2">
            <span>{m.competencies?.name}</span>
            <span className="flex items-center gap-3 text-sm text-muted-foreground">{levelName(m.level)}
              <Button size="icon" variant="ghost" onClick={() => remove(m.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
