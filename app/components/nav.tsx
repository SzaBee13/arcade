import Link from "next/link";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser } from "@/lib/user-store";
import { ToastProvider } from "@/app/components/toast-provider";

export async function Nav() {
  const session = await getSession();
  const arcadeUser = session?.user
    ? getOrCreateUser(session.user.uuid, session.user.email)
    : null;

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-line/28 bg-bg-night/85 px-5 py-3 backdrop-blur">
        <Link href="/" className="font-display text-lg font-extrabold">Arcade Gate</Link>
        <div className="flex items-center gap-4">
          {arcadeUser ? (
            <>
              <Link href="/friends" className="text-sm text-ink-2 transition-colors hover:text-ink-1">Friends</Link>
              <Link href="/profile" className="text-sm text-ink-2 transition-colors hover:text-ink-1">
                {arcadeUser.nickname || arcadeUser.username || session?.user?.display_name || "Profile"}
              </Link>
            </>
          ) : (
            <> 
              <Link href="/legal/terms" className="text-sm text-ink-2">Terms</Link>
              <Link href="/legal/privacy" className="text-sm text-ink-2">Privacy</Link>
              <Link href="/legal/license" className="text-sm text-ink-2">License</Link>
            </>
          )}
        </div>
      </nav>
      <ToastProvider enabled={!!session} />
    </>
  );
}
