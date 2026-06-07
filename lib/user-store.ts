export type ArcadeUser = {
  uuid: string;
  email: string;
  username: string;
  nickname: string;
  bio: string;
  usernameChangedAt: number;
  onboarded: boolean;
};

const users = new Map<string, ArcadeUser>();

export function getOrCreateUser(uuid: string, email: string): ArcadeUser {
  let user = users.get(uuid);
  if (!user) {
    user = {
      uuid,
      email,
      username: "",
      nickname: "",
      bio: "",
      usernameChangedAt: 0,
      onboarded: false,
    };
    users.set(uuid, user);
  }
  return user;
}

export function getUserByUuid(uuid: string): ArcadeUser | null {
  return users.get(uuid) ?? null;
}

export function findUsers(query: string): ArcadeUser[] {
  const q = query.toLowerCase();
  const results: ArcadeUser[] = [];
  for (const user of users.values()) {
    if (!user.onboarded) continue;
    if (
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    ) {
      results.push(user);
    }
  }
  return results;
}

export function isUsernameTaken(username: string, excludeUuid?: string): boolean {
  for (const user of users.values()) {
    if (user.uuid === excludeUuid) continue;
    if (user.username.toLowerCase() === username.toLowerCase()) return true;
  }
  return false;
}

export function setUsername(uuid: string, username: string): ArcadeUser {
  const user = users.get(uuid);
  if (!user) throw new Error("User not found.");
  if (isUsernameTaken(username, uuid)) throw new Error("Username already taken.");
  user.username = username;
  user.usernameChangedAt = Date.now();
  user.onboarded = true;
  return user;
}

export function setProfile(uuid: string, nickname: string, bio: string): ArcadeUser {
  const user = users.get(uuid);
  if (!user) throw new Error("User not found.");
  user.nickname = nickname || "";
  user.bio = bio || "";
  return user;
}

export function fillFromCookies(
  user: { username: string; nickname: string; bio: string },
  cookieStore: { get: (name: string) => { value: string } | undefined },
) {
  if (!user.username) {
    user.username = cookieStore.get("arcade_username")?.value || "";
  }
  if (!user.nickname) {
    user.nickname = cookieStore.get("arcade_nickname")?.value || "";
  }
  if (!user.bio) {
    user.bio = cookieStore.get("arcade_bio")?.value || "";
  }
}

export function canChangeUsername(uuid: string): { ok: boolean; remainingDays: number } {
  const user = users.get(uuid);
  if (!user) return { ok: true, remainingDays: 0 };
  if (!user.usernameChangedAt) return { ok: true, remainingDays: 0 };
  const elapsed = Date.now() - user.usernameChangedAt;
  const daysSince = elapsed / (1000 * 60 * 60 * 24);
  if (daysSince >= 30) return { ok: true, remainingDays: 0 };
  return { ok: false, remainingDays: Math.ceil(30 - daysSince) };
}
