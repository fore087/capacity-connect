import { supabase } from "@/integrations/supabase/client";

export type Bucket = "avatars" | "course-files" | "submissions";

const LIMITS: Record<Bucket, number> = {
  avatars: 2 * 1024 * 1024,
  "course-files": 50 * 1024 * 1024,
  submissions: 20 * 1024 * 1024,
};

/** Checks size and extension before upload. Returns an error message or null. */
export function validateFile(file: File, bucket: Bucket, allowedExt?: string[]): string | null {
  if (file.size > LIMITS[bucket]) return `File is too large (max ${Math.round(LIMITS[bucket] / 1024 / 1024)} MB).`;
  if (allowedExt && allowedExt.length) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExt.includes(ext)) return `File type .${ext} is not allowed. Allowed: ${allowedExt.join(", ")}`;
  }
  return null;
}

export function parseExtList(s: string | null | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
}

/** Uploads a file under the given folder and returns its storage path. */
export async function uploadFile(bucket: Bucket, folder: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Opens a short-lived private link to a stored file. */
export async function openFile(bucket: Bucket, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error || !data) throw error ?? new Error("Could not open file");
  window.open(data.signedUrl, "_blank", "noopener");
}

export async function signedUrl(bucket: Bucket, path: string, seconds = 3600) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export function fileName(path: string | null | undefined) {
  if (!path) return "";
  return path.split("/").pop()!.replace(/^\d+_/, "");
}
