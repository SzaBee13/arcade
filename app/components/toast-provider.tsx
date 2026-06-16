"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type ToastInvite = {
  id: string;
  fromUsername: string;
  roomId: string;
  game: string;
};

type FriendRequestItem = {
  id: string;
  fromUuid: string;
  fromUsername: string;
  fromNickname: string;
  status: string;
};

type ToastFriendRequest = {
  id: string;
  fromName: string;
};

export function ToastProvider({ enabled }: { enabled: boolean }) {
  const [invites, setInvites] = useState<ToastInvite[]>([]);
  const [friendReqs, setFriendReqs] = useState<ToastFriendRequest[]>([]);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenReqs = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    pollRef.current = setInterval(async () => {
      try {
        const [inviteRes, friendsRes] = await Promise.all([
          fetch("/api/invite"),
          fetch("/api/friends"),
        ]);

        if (inviteRes.ok) {
          const data = await inviteRes.json();
          if (data?.invites?.length) {
            setInvites(data.invites.map((i: ToastInvite) => ({
              id: i.id,
              fromUsername: i.fromUsername,
              roomId: i.roomId,
              game: i.game,
            })));
          }
        }

        if (friendsRes.ok) {
          const data = await friendsRes.json();
          const incoming: FriendRequestItem[] = data?.incoming ?? [];
          const newReqs = incoming.filter((r) => !seenReqs.current.has(r.id));
          for (const r of incoming) seenReqs.current.add(r.id);
          if (newReqs.length > 0) {
            setFriendReqs((prev) => [
              ...prev,
              ...newReqs.map((r) => ({ id: r.id, fromName: r.fromNickname || r.fromUsername })),
            ]);
          }
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled]);

  const handleJoin = useCallback(async (invite: ToastInvite) => {
    await fetch("/api/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", inviteId: invite.id }),
    });
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    router.push(`/games/${invite.game}?roomId=${invite.roomId}`);
  }, [router]);

  const handleDismiss = useCallback(async (invite: ToastInvite) => {
    await fetch("/api/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", inviteId: invite.id }),
    });
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  }, []);

  const handleAcceptFriend = useCallback(async (requestId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept", requestId }),
    });
    setFriendReqs((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const handleDismissFriend = useCallback(async (requestId: string) => {
    setFriendReqs((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const all = [
    ...invites.map((i) => ({ type: "invite" as const, data: i })),
    ...friendReqs.map((r) => ({ type: "friendreq" as const, data: r })),
  ];

  if (!all.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] grid max-w-[360px] gap-2">
      {all.map((item) => {
        if (item.type === "invite") {
          const inv = item.data;
          return (
            <div key={inv.id} className="flex animate-[rise_0.3s_ease_both] items-center gap-2 rounded-xl border border-line/28 bg-panel/96 p-3 shadow-2xl backdrop-blur">
              <span className="flex-1 text-sm text-ink-1">
                <strong>{inv.fromUsername}</strong> invited you to {inv.game}!
              </span>
              <button type="button" className="btn-arcade tiny" onClick={() => handleJoin(inv)}>
                Join
              </button>
              <button type="button" className="border-none bg-none p-0 text-sm text-ink-3" onClick={() => handleDismiss(inv)}>
                ✕
              </button>
            </div>
          );
        }
        const fr = item.data;
        return (
          <div key={fr.id} className="flex animate-[rise_0.3s_ease_both] items-center gap-2 rounded-xl border border-line/28 bg-panel/96 p-3 shadow-2xl backdrop-blur">
            <span className="flex-1 text-sm text-ink-1">
              <strong>{fr.fromName}</strong> sent you a friend request
            </span>
            <button type="button" className="btn-arcade tiny" onClick={() => handleAcceptFriend(fr.id)}>
              Accept
            </button>
            <button type="button" className="border-none bg-none p-0 text-sm text-ink-3" onClick={() => handleDismissFriend(fr.id)}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
