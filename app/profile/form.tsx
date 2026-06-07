"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ProfileData = {
  username: string;
  nickname: string;
  bio: string;
};

export function ProfileForm() {
  const [current, setCurrent] = useState<ProfileData | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [canChange, setCanChange] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setCurrent({ username: data.user.username, nickname: data.user.nickname, bio: data.user.bio });
          setNickname(data.user.nickname || "");
          setBio(data.user.bio || "");
        }
        if (data?.cooldown !== undefined) {
          setCanChange(data.canChange);
          setCooldown(data.cooldown);
        }
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      if (newUsername.trim() && current && newUsername.trim() !== current.username) {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "set-username", username: newUsername.trim() }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setLoading(false); return; }
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-profile", nickname: nickname.trim(), bio: bio.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setNewUsername("");
      setMessage("Profile updated!");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!current) {
    return <p className="text-ink-3">Loading profile...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <fieldset className="grid gap-2.5 rounded-xl border border-line/28 p-3">
        <legend className="px-1.5 text-xs font-bold uppercase tracking-widest text-ink-3">Current</legend>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink-3">Username</span>
            <span className="font-semibold text-ink-1">@{current.username}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink-3">Nickname</span>
            <span className="font-semibold text-ink-1">{current.nickname || <span className="text-ink-3">&mdash;</span>}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink-3">Bio</span>
            <span className="font-semibold text-ink-1">{current.bio || <span className="text-ink-3">&mdash;</span>}</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-2.5 rounded-xl border border-line/28 p-3">
        <legend className="px-1.5 text-xs font-bold uppercase tracking-widest text-ink-3">Change</legend>

        <label className="grid gap-1 text-sm text-ink-2">
          New username
          <input
            className="input-arcade mt-0.5"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={current.username}
            disabled={!canChange}
            pattern="^[a-zA-Z0-9_-]+$"
            title="Letters, numbers, hyphens, and underscores only"
          />
          {!canChange ? (
            <p className="m-0 text-xs text-ink-3">Can change in {cooldown} day(s)</p>
          ) : newUsername ? (
            <p className="m-0 text-xs text-ink-3">Will change from @{current.username} to @{newUsername.trim()}</p>
          ) : (
            <p className="m-0 text-xs text-ink-3">Leave empty to keep @{current.username}</p>
          )}
        </label>

        <label className="grid gap-1 text-sm text-ink-2">
          Nickname
          <input
            className="input-arcade mt-0.5"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={current.nickname || "Display name"}
          />
        </label>

        <label className="grid gap-1 text-sm text-ink-2">
          Bio
          <textarea
            className="input-arcade mt-0.5 min-h-12 resize-y px-2.5 py-2"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={current.bio || "Tell us about yourself"}
            rows={3}
          />
        </label>
      </fieldset>

      {message ? <p className="m-0 text-sm text-bg-glow-2">{message}</p> : null}
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn-arcade" disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
