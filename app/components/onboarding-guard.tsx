"use client";

import { useEffect } from "react";

export function OnboardingGuard() {
  useEffect(() => {
    const stored = localStorage.getItem("arcade_gate_profile");
    if (!stored) return;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user?.username) {
          window.location.href = "/onboarding";
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
