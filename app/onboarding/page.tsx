import { redirect } from "next/navigation";
import { getSession } from "@/lib/szabee";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/api/auth/login");

  return (
    <main className="mx-auto mt-8 max-w-[540px] px-4">
      <div className="rounded-2xl border border-line/28 bg-panel/80 p-6 backdrop-blur">
        <h1 className="mb-2 font-display text-xl">Welcome to Arcade Gate</h1>
        <p className="mb-4 text-ink-2">Choose a username to get started. You can change it every 30 days.</p>
        <OnboardingForm />
      </div>
    </main>
  );
}
