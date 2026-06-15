import { randomUUID } from "node:crypto";

export type FriendEntry = {
  uuid: string;
  username: string;
  nickname: string;
  addedAt: number;
};

export type FriendRequestEntry = {
  id: string;
  fromUuid: string;
  fromUsername: string;
  fromNickname: string;
  toUuid: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
};

const friendsByUser = new Map<string, FriendEntry[]>();
const requests: FriendRequestEntry[] = [];

export function getFriends(userUuid: string): FriendEntry[] {
  return friendsByUser.get(userUuid) ?? [];
}

export function addFriend(userUuid: string, entry: FriendEntry): void {
  const list = friendsByUser.get(userUuid) ?? [];
  if (!list.some((f) => f.uuid === entry.uuid)) {
    list.push(entry);
    friendsByUser.set(userUuid, list);
  }
}

export function addMutualFriends(
  first: { uuid: string; username: string; nickname: string },
  second: { uuid: string; username: string; nickname: string },
): void {
  if (first.uuid === second.uuid) {
    throw new Error("Cannot add yourself as a friend.");
  }

  const addedAt = Date.now();
  addFriend(first.uuid, {
    uuid: second.uuid,
    username: second.username,
    nickname: second.nickname,
    addedAt,
  });
  addFriend(second.uuid, {
    uuid: first.uuid,
    username: first.username,
    nickname: first.nickname,
    addedAt,
  });
}

export function removeFriend(userUuid: string, friendUuid: string): void {
  const list = friendsByUser.get(userUuid);
  if (!list) return;
  friendsByUser.set(
    userUuid,
    list.filter((f) => f.uuid !== friendUuid),
  );
}

export function sendRequest(fromUuid: string, fromUsername: string, fromNickname: string, toUuid: string): void {
  if (requests.some((r) => r.fromUuid === fromUuid && r.toUuid === toUuid && r.status === "pending")) {
    return;
  }
  requests.push({
    id: randomUUID().slice(0, 12),
    fromUuid,
    fromUsername,
    fromNickname,
    toUuid,
    status: "pending",
    createdAt: Date.now(),
  });
}

export function getPendingForUser(userUuid: string): FriendRequestEntry[] {
  return requests.filter((r) => r.toUuid === userUuid && r.status === "pending");
}

export function getSentRequests(userUuid: string): FriendRequestEntry[] {
  return requests.filter((r) => r.fromUuid === userUuid && r.status === "pending");
}

export function acceptRequest(requestId: string): FriendRequestEntry | null {
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return null;
  req.status = "accepted";
  addFriend(req.toUuid, {
    uuid: req.fromUuid,
    username: req.fromUsername,
    nickname: req.fromNickname,
    addedAt: Date.now(),
  });
  return req;
}

export function declineRequest(requestId: string): FriendRequestEntry | null {
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return null;
  req.status = "declined";
  return req;
}
