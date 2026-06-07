"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function OnboardingForm() {
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.username) {
          window.location.href = "/";
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-username", username: username.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-profile", nickname: nickname.trim(), bio: bio.trim() }),
      });
      document.cookie = "arcade_onboarded=1; path=/; max-age=31536000";
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="text-ink-3">Checking...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label className="grid gap-1 text-sm text-ink-2">
        Username <span className="text-danger">*</span>
        <input
          className="input-arcade"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="coolgamer99"
          required
          minLength={2}
          pattern="^[a-zA-Z0-9_-]+$"
          title="Letters, numbers, hyphens, and underscores only"
        />
      </label>
      <label className="grid gap-1 text-sm text-ink-2">
        Nickname
        <input
          className="input-arcade"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Optional display name"
        />
      </label>
      <label className="grid gap-1 text-sm text-ink-2">
        Bio
        <textarea
          className="input-arcade min-h-12 resize-y px-2.5 py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself (optional)"
          rows={3}
        />
      </label>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn-arcade" disabled={loading}>
        {loading ? "Saving..." : "Get Started"}
      </button>
    </form>
  );
}
