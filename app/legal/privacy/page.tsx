import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-base mb-2">Effective Date: 2026-06-07 (yyyy-mm-dd)</p>
      <p className="text-base mb-4">Contact: privacy@szabee.com</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">1. Introduction</h2>
      <p className="text-base">
        This Privacy Policy outlines how we collect, use, and protect your personal information when you use the Arcade App.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">2. Data We Collect</h2>
      <p className="text-base">We collect the following types of data:</p>
      <ul className="list-disc list-inside ml-4 text-base">
        <li>Personal information (name, email, etc.)</li>
        <li>Usage data (app interactions, device information, etc.)</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2">3. How We Use Your Data</h2>
      <p className="text-base">We use your data to:</p>
      <ul className="list-disc list-inside ml-4 text-base">
        <li>Provide and improve our app</li>
        <li>Personalize your experience</li>
        <li>Communicate with you</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2">4. Authentication</h2>
      <p className="text-base">
        We use authentication services to verify your identity and protect your account. We use the following authentication services through SzaBee ID (first‑party):
      </p>
      <ul className="list-disc list-inside ml-4 text-base">
        <li>Sign in with Google</li>
        <li>Sign in with GitHub</li>
        <li>Sign in with Discord</li>
      </ul>
      <p className="text-base">
        You can read SzaBee ID's privacy policy 
        <a href="https://szabee.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-primary">
          here
        </a>.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">5. Third‑Party Services</h2>
      <p className="text-base">We use third‑party services such as Vercel and GitHub to operate the app.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">6. Cookies</h2>
      <p className="text-base">We use cookies to store your authentication session, remember preferences, and track usage.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">7. Data Retention</h2>
      <p className="text-base">We retain your data as long as necessary to provide services and comply with legal obligations.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">8. Your Rights</h2>
      <p className="text-base">
        You have the right to access, update, or delete your personal information at any time.
      </p>
    </article>
  );
}
