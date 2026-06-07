import { redirect } from "next/navigation";
import { getSession } from "@/lib/szabee";
import { FriendsClient } from "./client";

export default async function FriendsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/api/auth/login");

  return (
    <main className="mx-auto mt-8 max-w-[540px] px-4">
      <h1 className="mb-4 font-display text-xl">Friends</h1>
      <FriendsClient />
    </main>
  );
}
