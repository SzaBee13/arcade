import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/szabee";
import { findUsers } from "@/lib/user-store";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return bad("Authentication required.", 401);

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) return NextResponse.json({ users: [] });

  const results = findUsers(q).map((u) => ({
    uuid: u.uuid,
    username: u.username,
    nickname: u.nickname,
    email: u.email,
  }));

  return NextResponse.json({ users: results });
}
