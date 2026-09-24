import { useQuery } from "@tanstack/react-query";
import { signedUrl } from "@/lib/files";

/** Shows a stored profile photo (private storage, short-lived link) or initials. */
export function UserAvatar({ path, name, size = 48 }: { path: string | null | undefined; name: string; size?: number }) {
  const { data: url } = useQuery({
    queryKey: ["avatar", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: () => signedUrl("avatars", path!),
  });
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground" style={{ width: size, height: size, fontSize: size / 2.6 }}>
      {initials || "?"}
    </span>
  );
}
