"use client";

import { useEffect, useState } from "react";

type FriendUser = { uuid: string; username: string; nickname: string };
type RequestEntry = {
  id: string;
  fromUuid: string;
  fromUsername: string;
  fromNickname: string;
  status: string;
};
type SearchResult = { uuid: string; username: string; nickname: string; email: string };

type FriendResponse = {
  friends: FriendUser[];
  incoming: RequestEntry[];
  sent: RequestEntry[];
};

async function api(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function FriendsClient() {
  const [data, setData] = useState<FriendResponse | null>(null);
  const [tab, setTab] = useState<"friends" | "incoming" | "search">("friends");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  async function load() {
    const d = await api("/api/friends") as FriendResponse;
    setData(d);
  }

  useEffect(() => {
    void api("/api/friends").then((d: FriendResponse) => setData(d));
  }, []);

  async function handleSearch() {
    if (!searchQ.trim()) return;
    const res = await api(`/api/users?q=${encodeURIComponent(searchQ.trim())}`);
    setSearchResults(res.users || []);
  }

  async function sendRequest(uuid: string) {
    await api("/api/friends", { action: "request", uuid });
    load();
  }

  async function accept(id: string) {
    await api("/api/friends", { action: "accept", requestId: id });
    load();
  }

  async function decline(id: string) {
    await api("/api/friends", { action: "decline", requestId: id });
    load();
  }

  async function remove(uuid: string) {
    await api("/api/friends", { action: "remove", uuid });
    load();
  }

  async function createInviteLink() {
    setCreatingInvite(true);
    setInviteMessage("");
    try {
      const res = await api("/api/friend-invites", {});
      if (res.error) {
        setInviteMessage(res.error);
        return;
      }
      setInviteLink(res.invite.url);
      setInviteMessage("Invite link created.");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteMessage("Invite link copied.");
  }

  return (
    <div className="rounded-2xl border border-line/28 bg-panel/80 p-4 backdrop-blur">
      <div className="mb-4 grid gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.6)] p-3">
        <div>
          <h2 className="m-0 text-sm font-bold">Friend Invite Link</h2>
          <p className="m-0 mt-1 text-xs text-ink-3">Create a link anyone can use to sign in and become your friend.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-arcade" onClick={createInviteLink} disabled={creatingInvite}>
            {creatingInvite ? "Creating..." : "Create Link"}
          </button>
          {inviteLink ? (
            <button type="button" className="btn-arcade ghost" onClick={copyInviteLink}>
              Copy
            </button>
          ) : null}
        </div>
        {inviteLink ? (
          <input className="input-arcade" value={inviteLink} readOnly onFocus={(e) => e.currentTarget.select()} />
        ) : null}
        {inviteMessage ? <p className="m-0 text-xs text-ink-3">{inviteMessage}</p> : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button type="button" className={`btn-arcade flex-1 ${tab === "friends" ? "active" : "border-dashed"}`} onClick={() => setTab("friends")}>
          Friends {data?.friends.length ? `(${data.friends.length})` : ""}
        </button>
        <button type="button" className={`btn-arcade flex-1 ${tab === "incoming" ? "active" : "border-dashed"}`} onClick={() => setTab("incoming")}>
          Requests {data?.incoming.length ? `(${data.incoming.length})` : ""}
        </button>
        <button type="button" className={`btn-arcade flex-1 ${tab === "search" ? "active" : "border-dashed"}`} onClick={() => setTab("search")}>
          Add Friend
        </button>
      </div>

      {tab === "friends" && (
        <div className="grid gap-2">
          {data?.friends.length === 0 ? (
            <p className="text-sm text-ink-3">No friends yet. Search for users to add.</p>
          ) : (
            data?.friends.map((f) => (
              <div key={f.uuid} className="flex items-center justify-between gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.6)] p-2.5">
                <div className="flex flex-col gap-0.5 text-sm">
                  <strong>{f.nickname || f.username}</strong>
                  <span className="text-ink-3"> @{f.username}</span>
                </div>
                <button type="button" className="btn-arcade tiny danger" onClick={() => remove(f.uuid)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "incoming" && (
        <div className="grid gap-2">
          {data?.incoming.length === 0 ? (
            <p className="text-sm text-ink-3">No pending requests.</p>
          ) : (
            data?.incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.6)] p-2.5">
                <div className="flex flex-col gap-0.5 text-sm">
                  <strong>{r.fromNickname || r.fromUsername}</strong>
                  <span className="text-ink-3"> @{r.fromUsername}</span>
                  <span className="self-start rounded-full bg-bg-glow-2/20 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-bg-glow-2">Pending</span>
                </div>
                <div className="flex flex-row gap-1.5">
                  <button type="button" className="btn-arcade tiny" onClick={() => accept(r.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn-arcade tiny danger" onClick={() => decline(r.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}

          {data?.sent.length ? (
            <>
              <h3 className="m-0 text-sm">Sent Requests</h3>
              {data.sent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.6)] p-2.5">
                  <div className="flex flex-col gap-0.5 text-sm">
                    <strong>{r.fromNickname || r.fromUsername}</strong>
                    <span className="self-start rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-200">Sent</span>
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}

      {tab === "search" && (
        <div>
          <div className="mb-4 flex gap-2">
            <input
              className="input-arcade flex-1"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by username or email"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button type="button" className="btn-arcade" onClick={handleSearch}>Search</button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid gap-2">
              {searchResults.map((u) => (
                <div key={u.uuid} className="flex items-center justify-between gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.6)] p-2.5">
                  <div className="flex flex-col gap-0.5 text-sm">
                    <strong>{u.nickname || u.username}</strong>
                    <span className="text-ink-3"> @{u.username}</span>
                    <span className="text-ink-3">{u.email}</span>
                  </div>
                  <button type="button" className="btn-arcade tiny" onClick={() => sendRequest(u.uuid)}>
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
