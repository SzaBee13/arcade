import Link from "next/link";
import { BarricadeBoard } from "@/app/games/barricade/playground";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser } from "@/lib/user-store";

export default async function BarricadePage() {
  const session = await getSession();
  const arcadeUser = session?.user ? getOrCreateUser(session.user.uuid, session.user.email) : null;

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-10 max-sm:px-3 max-sm:py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-ink-2 underline underline-offset-2">
          Back to lobby
        </Link>
        <div className="grid gap-0 rounded-xl border border-line/28 bg-[rgba(9,16,31,0.52)] px-3 py-2">
          {arcadeUser ? (
            <>
              <span className="font-bold">{arcadeUser.nickname || arcadeUser.username}</span>
              <span className="text-sm text-ink-2">@{arcadeUser.username}</span>
            </>
          ) : session?.user ? (
            <>
              <span className="font-bold">{session.user.display_name}</span>
              <span className="text-sm text-ink-2">@{session.user.id}</span>
            </>
          ) : (
            <span className="text-sm text-ink-2">Playing as guest</span>
          )}
        </div>
      </header>

      <section className="mb-6 max-w-3xl">
        <p className="m-0 text-xs uppercase tracking-widest text-ink-3">Game 01</p>
        <h1 className="mt-2.5 font-display text-[clamp(2rem,4vw,3.4rem)] leading-tight">Barricade</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-ink-2">
          Reach the far edge before your opponent. On your turn, either move one step or place one
          barricade spanning two squares. Play against bot AI or invite friends to multiplayer.
        </p>
      </section>

      <BarricadeBoard playerName={arcadeUser?.nickname || arcadeUser?.username || session?.user?.display_name || "Guest"} />
    </main>
  );
}
