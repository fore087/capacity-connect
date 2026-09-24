import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function PublicNav() {
  const { session } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2 md:gap-4">
          <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Courses
          </Link>
          {session ? (
            <Button asChild size="sm">
              <Link to="/dashboard">My dashboard</Link>
            </Button>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "register" }}>Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row">
        <span>© {new Date().getFullYear()} Capacity Connect</span>
        <span className="italic">Build Skills. Build Capacity. Build the Future.</span>
      </div>
    </footer>
  );
}
