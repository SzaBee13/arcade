"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type ToastInvite = {
  id: string;
  fromUsername: string;
  roomId: string;
  game: string;
};

export function ToastProvider() {
  const [invites, setInvites] = useState<ToastInvite[]>([]);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/invite");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.invites?.length) {
          setInvites(data.invites.map((i: any) => ({
            id: i.id,
            fromUsername: i.fromUsername,
            roomId: i.roomId,
            game: i.game,
          })));
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  if (!invites.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] grid max-w-[360px] gap-2">
      {invites.map((invite) => (
        <div key={invite.id} className="flex animate-[rise_0.3s_ease_both] items-center gap-2 rounded-xl border border-line/28 bg-panel/96 p-3 shadow-2xl backdrop-blur">
          <span className="flex-1 text-sm text-ink-1">
            <strong>{invite.fromUsername}</strong> invited you to {invite.game}!
          </span>
          <button type="button" className="btn-arcade tiny" onClick={() => handleJoin(invite)}>
            Join
          </button>
          <button type="button" className="border-none bg-none p-0 text-sm text-ink-3" onClick={() => handleDismiss(invite)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
