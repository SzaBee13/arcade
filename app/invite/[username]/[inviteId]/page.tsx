import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { validateFriendInviteLink } from "@/lib/friend-invite-store";
import { addMutualFriends } from "@/lib/friends-store";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser } from "@/lib/user-store";

type InvitePageProps = {
  params: Promise<{ username: string; inviteId: string }>;
  searchParams: Promise<{ token?: string }>;
};

function card(children: ReactNode) {
  return (
    <main className="mx-auto mt-8 max-w-[540px] px-4">
      <div className="rounded-2xl border border-line/28 bg-panel/80 p-6 backdrop-blur">
        {children}
      </div>
    </main>
  );
}

export default async function FriendInvitePage({ params, searchParams }: InvitePageProps) {
  const { username, inviteId } = await params;
  const { token = "" } = await searchParams;
  const invite = validateFriendInviteLink(inviteId, token, username);

  if (!invite) {
    return card(
      <>
        <h1 className="mb-2 font-display text-xl">Invalid Invite</h1>
        <p className="mb-4 text-ink-2">This friend invite link is invalid or no longer available.</p>
        <Link href="/" className="btn-arcade inline-flex">Back to Arcade</Link>
      </>,
    );
  }

  const session = await getSession();
  const returnTo = `/invite/${encodeURIComponent(username)}/${encodeURIComponent(inviteId)}?token=${encodeURIComponent(token)}`;

  if (!session?.user) {
    return card(
      <>
        <h1 className="mb-2 font-display text-xl">Friend Invite</h1>
        <p className="mb-4 text-ink-2">
          @{invite.fromUsername} invited you to become friends. Sign in or create an account to accept.
        </p>
        <Link href={`/signin?returnTo=${encodeURIComponent(returnTo)}`} className="btn-arcade inline-flex">
          Sign in or sign up
        </Link>
      </>,
    );
  }

  const me = getOrCreateUser(session.user.uuid, session.user.email);
  if (session.user.uuid === invite.fromUuid) {
    return card(
      <>
        <h1 className="mb-2 font-display text-xl">Friend Invite</h1>
        <p className="mb-4 text-ink-2">You cannot accept your own friend invite link.</p>
        <Link href="/friends" className="btn-arcade inline-flex">Back to Friends</Link>
      </>,
    );
  }

  addMutualFriends(
    {
      uuid: session.user.uuid,
      username: me.username || session.user.display_name || session.user.uuid,
      nickname: me.nickname || me.username || session.user.display_name,
    },
    {
      uuid: invite.fromUuid,
      username: invite.fromUsername,
      nickname: invite.fromNickname,
    },
  );

  redirect("/friends?invite=accepted");
}
