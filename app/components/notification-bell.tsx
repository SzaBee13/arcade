"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type GameInvite = {
  id: string;
  fromUsername: string;
  roomId: string;
  game: string;
};

type FriendRequest = {
  id: string;
  fromUuid: string;
  fromUsername: string;
  fromNickname: string;
  status: string;
};

export function NotificationBell() {
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const total = invites.length + requests.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const poll = async () => {
      try {
        const [inviteRes, friendsRes] = await Promise.all([
          fetch("/api/invite"),
          fetch("/api/friends"),
        ]);
        if (inviteRes.ok) {
          const data = await inviteRes.json();
          setInvites(data?.invites ?? []);
        }
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setRequests(data?.incoming ?? []);
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const handleAccept = useCallback(async (requestId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept", requestId }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const handleDecline = useCallback(async (requestId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "decline", requestId }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const handleJoinGame = useCallback(
    async (invite: GameInvite) => {
      await fetch("/api/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear", inviteId: invite.id }),
      });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setOpen(false);
      router.push(`/games/${invite.game}?roomId=${invite.roomId}`);
    },
    [router],
  );

  const handleDismissGame = useCallback(async (inviteId: string) => {
    await fetch("/api/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", inviteId }),
    });
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1 text-sm text-ink-2 transition-colors hover:text-ink-1"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger text-[10px] font-bold leading-none text-white px-[3px]">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && total > 0 && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[400px] overflow-y-auto rounded-xl border border-line/28 bg-panel/98 p-2 shadow-2xl backdrop-blur">
          {requests.length > 0 && (
            <div>
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-3">Friend Requests</p>
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                  <span className="flex-1 truncate text-ink-1">{r.fromNickname || r.fromUsername}</span>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-arcade tiny" onClick={() => handleAccept(r.id)}>Accept</button>
                    <button type="button" className="btn-arcade tiny danger" onClick={() => handleDecline(r.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invites.length > 0 && (
            <div className={requests.length > 0 ? "mt-1 border-t border-line/15 pt-1" : ""}>
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-3">Game Invites</p>
              {invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                  <span className="flex-1 truncate text-ink-1">
                    <strong>{i.fromUsername}</strong> invited you to <span className="capitalize">{i.game}</span>
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-arcade tiny" onClick={() => handleJoinGame(i)}>Join</button>
                    <button type="button" className="border-none bg-none p-0 text-xs text-ink-3 hover:text-ink-2" onClick={() => handleDismissGame(i.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
