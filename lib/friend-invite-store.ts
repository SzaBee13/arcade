import { randomBytes, randomUUID } from "node:crypto";

export type FriendInviteLink = {
  id: string;
  token: string;
  fromUuid: string;
  fromUsername: string;
  fromNickname: string;
  createdAt: number;
};

const invites = new Map<string, FriendInviteLink>();

export function createFriendInviteLink(
  fromUuid: string,
  fromUsername: string,
  fromNickname: string,
): FriendInviteLink {
  const invite: FriendInviteLink = {
    id: randomUUID().slice(0, 12),
    token: randomBytes(24).toString("base64url"),
    fromUuid,
    fromUsername,
    fromNickname,
    createdAt: Date.now(),
  };
  invites.set(invite.id, invite);
  return invite;
}

export function getFriendInviteLink(inviteId: string): FriendInviteLink | null {
  return invites.get(inviteId) ?? null;
}

export function validateFriendInviteLink(
  inviteId: string,
  token: string,
  username: string,
): FriendInviteLink | null {
  const invite = getFriendInviteLink(inviteId);
  if (!invite) return null;
  if (invite.token !== token) return null;
  if (invite.fromUsername.toLowerCase() !== username.toLowerCase()) return null;
  return invite;
}
