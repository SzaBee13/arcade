import { redirect } from "next/navigation";
import { getSession } from "@/lib/szabee";
import { ProfileForm } from "./form";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/api/auth/login");

  return (
    <main className="mx-auto mt-8 max-w-[540px] px-4">
      <div className="rounded-2xl border border-line/28 bg-panel/80 p-6 backdrop-blur">
        <h1 className="mb-2 font-display text-xl">Profile</h1>
        <ProfileForm />
      </div>
    </main>
  );
}
