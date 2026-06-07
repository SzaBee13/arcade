"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    // Redirect to OAuth login flow
    router.push("/api/auth/login");
  };

  return (
    <main className="mx-auto mt-8 max-w-[540px] px-4">
      <div className="rounded-2xl border border-line/28 bg-panel/80 p-6 backdrop-blur">
        <h1 className="mb-2 font-display text-xl">Sign In</h1>
        <p className="mb-4 text-ink-2">Continue with your Szabee ID to access the Arcade.</p>
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="form-checkbox h-4 w-4 text-primary"
          />
          <span className="text-sm text-ink-2">
            I have read and agree to the&nbsp;
            <a href="/legal/terms" className="underline" target="_blank" rel="noopener noreferrer">Terms of Service</a>
            ,&nbsp;
            <a href="/legal/privacy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            , and&nbsp;
            <a href="/legal/license" className="underline" target="_blank" rel="noopener noreferrer">License</a>.
          </span>
        </label>
        <button
          type="button"
          disabled={!accepted}
          onClick={handleContinue}
          className="btn-arcade disabled:opacity-50"
        >
          Continue with Szabee ID
        </button>
      </div>
    </main>
  );
}
