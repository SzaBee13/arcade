import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSync } from "@/app/components/profile-sync";
import { OnboardingGuard } from "@/app/components/onboarding-guard";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser, fillFromCookies } from "@/lib/user-store";
import { LogoutForm } from "@/app/components/logout-form";

const games = [
  {
    name: "Barricade",
    tag: "Live",
    description: "Race to the opposite side while sealing routes with tactical barricades.",
    href: "/games/barricade",
  },
  {
    name: "Nova Drift",
    tag: "Soon",
    description: "An endless dodge-runner with score combos and meteor storms.",
    href: "#",
  },
  {
    name: "Rune Match",
    tag: "Soon",
    description: "Fast puzzle rounds where chain reactions decide the leaderboard.",
    href: "#",
  },
];

const authErrors: Record<string, string> = {
  cloudflare_token_challenge: "SzaBee Cloudflare is blocking the server-to-server token exchange. The SzaBee zone must skip Managed Challenge/Bot checks for POST /oauth2/token.",
  invalid_oauth_state: "Login expired or was opened in another tab. Try again from this page.",
  missing_code_or_state: "Szabee did not return a complete login response. Try again.",
  token_exchange_failed: "Szabee rejected the login token exchange. Check the app redirect URI.",
  missing_access_token: "Szabee did not return an access token. Try again.",
  user_fetch_failed: "Login succeeded, but the profile could not be loaded.",
};

function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  if (code === "token_exchange_failed_403") {
    return "SzaBee returned HTTP 403 during token exchange. Save the OAuth app settings, keep Public client enabled, and verify the production redirect URI exactly matches this site.";
  }
  if (code.startsWith("token_exchange_failed")) {
    return `${authErrors.token_exchange_failed} (${code.replace("token_exchange_failed_", "HTTP ")})`;
  }
  return authErrors[code] ?? `Login failed: ${code}`;
}

export default async function Home({ searchParams }: { searchParams?: Promise<{ auth_error?: string }> }) {
  const params = await searchParams;
  const authError = authErrorMessage(params?.auth_error);
  const session = await getSession();
  const profile = session?.user ?? null;
  const arcadeUser = profile ? getOrCreateUser(profile.uuid, profile.email) : null;
  const cookieStore = await cookies();
  if (arcadeUser) fillFromCookies(arcadeUser, cookieStore);
  const hasCookie = cookieStore.get("arcade_onboarded")?.value === "1";

  if (profile && arcadeUser && !arcadeUser.onboarded && !arcadeUser.username && !hasCookie) {
    redirect("/onboarding");
  }

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-10 max-sm:px-3 max-sm:py-5">
      <OnboardingGuard />
      <ProfileSync profile={profile} />
      <div className="aurora-one pointer-events-none absolute -right-10 top-8 h-60 w-60 animate-[floaty_9s_ease-in-out_infinite] rounded-full bg-bg-glow/36 opacity-50 blur-3xl" aria-hidden />
      <div className="aurora-two pointer-events-none absolute -left-16 top-64 h-56 w-56 animate-[floaty_9s_ease-in-out_infinite] rounded-full bg-bg-glow-2/30 opacity-50 blur-3xl" aria-hidden />

      <section className="mb-6 max-w-3xl animate-[rise_0.8s_ease_both]">
        <p className="m-0 text-xs uppercase tracking-widest text-ink-3">Arcade Gate</p>
        <h1 className="mt-2.5 font-display text-[clamp(2rem,4vw,3.4rem)] leading-tight">Choose a game. Play instantly.</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-ink-2">
          Your mini-game lobby with one login and a saved player profile. Start with Barricade,
          then add more games as you grow your collection.
        </p>
      </section>

      <section className="w-full max-w-md animate-[rise_0.85s_ease_both] rounded-2xl border border-line/28 bg-panel/80 p-4 shadow-2xl backdrop-blur lg:p-5" style={{ animationDelay: "0.1s" }}>
        <h2 className="mb-2 font-display text-xl">Account</h2>
        {authError ? (
          <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink-1">
            {authError}
          </p>
        ) : null}
        {arcadeUser ? (
          <>
            <p className="m-0 text-lg font-bold">{arcadeUser.nickname || arcadeUser.username}</p>
            <p className="mt-1.5 text-sm text-ink-2">@{arcadeUser.username} &middot; {profile?.email}</p>
            {arcadeUser.bio ? <p className="mt-1.5 max-w-[40ch] truncate text-sm italic text-ink-2">{arcadeUser.bio}</p> : null}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link className="btn-arcade" href="/profile">Edit Profile</Link>
              <Link className="btn-arcade" href="/friends">Friends</Link>
              <LogoutForm />
            </div>
          </>
        ) : profile ? (
          <>
            <p className="m-0 text-lg font-bold">{profile.display_name}</p>
            <p className="mt-1.5 text-sm text-ink-2">@{profile.id} &middot; {profile.email}</p>
            <LogoutForm />
          </>
        ) : (
          <>
            <p className="text-sm text-ink-2">Sign in with your Szabee ID to save your profile and gameplay.</p>
            <Link className="btn-arcade mt-3 inline-flex" href="/signin">
              Continue with Szabee ID
            </Link>
          </>
        )}
      </section>

      <section className="mt-5 grid animate-[rise_0.9s_ease_both] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4" aria-label="Game selection">
        {games.map((game, i) => (
          <article key={game.name} className="flex min-h-[210px] flex-col justify-between gap-4 rounded-2xl border border-line/28 bg-gradient-to-br from-[rgba(23,34,58,0.88)] to-[rgba(14,22,40,0.96)] p-4 shadow-xl" style={{ animationDelay: `${i * 0.08}s` }}>
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl">{game.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-widest ${game.tag === "Live" ? "bg-bg-glow-2/20 text-bg-glow-2" : "bg-amber-300/15 text-amber-200"}`}>
                  {game.tag}
                </span>
              </div>
              <p className="m-0 mt-3 leading-relaxed text-ink-2">{game.description}</p>
            </div>
            {game.tag === "Live" ? (
              <Link className="btn-arcade min-w-28 self-end whitespace-nowrap" href={game.href}>
                Play now
              </Link>
            ) : (
              <button className="btn-arcade min-w-32 self-end whitespace-nowrap border-dashed opacity-50" type="button" disabled>
                Coming soon
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
