import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <nav className="mb-4 flex justify-center space-x-6 border-b pb-2">
        <Link href="/legal/terms" className="text-sm text-ink-2 hover:text-ink-1 transition-colors">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="text-sm text-ink-2 hover:text-ink-1 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/legal/license" className="text-sm text-ink-2 hover:text-ink-1 transition-colors">
          License
        </Link>
      </nav>
      <section className="prose prose-invert max-w-none" >{children}</section>
    </div>
  );
}

