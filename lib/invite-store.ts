import { randomUUID } from "node:crypto";

export type GameInvite = {
  id: string;
  fromUuid: string;
  fromUsername: string;
  toUuid: string;
  roomId: string;
  game: string;
  createdAt: number;
};

const invites: GameInvite[] = [];

export function createInvite(
  fromUuid: string,
  fromUsername: string,
  toUuid: string,
  roomId: string,
  game: string,
): GameInvite {
  const invite: GameInvite = {
    id: randomUUID().slice(0, 12),
    fromUuid,
    fromUsername,
    toUuid,
    roomId,
    game,
    createdAt: Date.now(),
  };
  invites.push(invite);
  return invite;
}

export function getPendingInvites(userUuid: string): GameInvite[] {
  return invites.filter((i) => i.toUuid === userUuid);
}

export function clearInvite(inviteId: string): void {
  const idx = invites.findIndex((i) => i.id === inviteId);
  if (idx !== -1) invites.splice(idx, 1);
}
