"use client";

import { useRouter } from "next/navigation";

export function LogoutForm() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="btn-arcade border-dashed" onClick={handleLogout}>
      Logout
    </button>
  );
}
