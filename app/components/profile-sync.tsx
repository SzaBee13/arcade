"use client";

import { useEffect } from "react";

type ProfileSyncProps = {
  profile: {
    uuid: string;
    id: string;
    email: string;
    display_name: string;
    provider: string;
    email_verified?: boolean | null;
  } | null;
};

const STORAGE_KEY = "arcade_gate_profile";

export function ProfileSync({ profile }: ProfileSyncProps) {
  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [profile]);

  return null;
}
