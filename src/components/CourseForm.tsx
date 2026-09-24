import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const courseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  category: z.string().trim().min(2, "Category is required").max(80),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration: z.string().trim().max(80),
  prerequisites: z.string().trim().max(2000),
  learning_objectives: z.string().trim().max(4000),
  skills: z.string().trim().max(500),
});
export type CourseInput = z.infer<typeof courseSchema>;

export function readCourseForm(form: HTMLFormElement) {
  const f = new FormData(form);
  return courseSchema.safeParse(Object.fromEntries(["title", "description", "category", "difficulty", "duration", "prerequisites", "learning_objectives", "skills"].map((k) => [k, String(f.get(k) ?? "")])));
}

export function CourseFields({ c }: { c?: Partial<Record<keyof CourseInput, string | null>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" defaultValue={c?.title ?? ""} required /></div>
      <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={c?.description ?? ""} rows={4} required /></div>
      <div className="space-y-2"><Label>Category</Label><Input name="category" defaultValue={c?.category ?? ""} placeholder="e.g. Data Science" required /></div>
      <div className="space-y-2">
        <Label>Difficulty</Label>
        <select name="difficulty" defaultValue={c?.difficulty ?? "beginner"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>
      </div>
      <div className="space-y-2"><Label>Duration</Label><Input name="duration" defaultValue={c?.duration ?? ""} placeholder="e.g. 6 weeks" /></div>
      <div className="space-y-2"><Label>Skills (comma separated)</Label><Input name="skills" defaultValue={c?.skills ?? ""} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Prerequisites</Label><Textarea name="prerequisites" defaultValue={c?.prerequisites ?? ""} rows={2} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Learning objectives (one per line)</Label><Textarea name="learning_objectives" defaultValue={c?.learning_objectives ?? ""} rows={4} /></div>
    </div>
  );
}

export function SubmitRow({ busy, label }: { busy: boolean; label: string }) {
  return <Button disabled={busy}>{busy ? "Saving…" : label}</Button>;
}
