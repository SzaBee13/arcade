import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-base mb-2">Effective Date: 2026-06-07 (yyyy-mm-dd)</p>
      <p className="text-base mb-4">Contact: privacy@szabee.com</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">1. Introduction</h2>
      <p className="text-base">
        This Terms of Service ("Terms") govern your use of the Arcade Website ("App").
        By using the App, you agree to be bound by these Terms. If you do not agree to these Terms, you may
        not use the App.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">2. Eligibility</h2>
      <p className="text-base">You must be at least 13 years old to use the App. If you are under 13 years old, you may not use the App or get parental approval to use it.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">3. User Accounts</h2>
      <p className="text-base">
        We use a first-party SzaBee ID for authentication and account management. Their terms and conditions are
        valid and govern your use of the App. To learn more about their terms and conditions, please visit their
        website <a href="https://oauth.szabee.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline text-primary">here</a>.
        We are not responsible for keeping your account secure. If you use a third‑party authentication service, you are
        responsible for any third‑party terms and conditions.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">4. Acceptable Use</h2>
      <p className="text-base">You agree to use the App in a manner that is consistent with these Terms and any applicable laws and regulations.</p>
      <p className="text-base mt-2">You may not:</p>
      <ul className="list-disc list-inside ml-4 text-base">
        <li>Use the App for any unlawful or prohibited purpose</li>
        <li>Use the App to engage in any activity that is harmful to others or violates any applicable law</li>
        <li>Use the App to collect or store personal data about others without their consent</li>
        <li>Use the App to distribute or sell any content without the express written permission of the content owner</li>
      </ul>
      <p className="text-base mt-2">You may:</p>
      <ul className="list-disc list-inside ml-4 text-base">
        <li>Use the App to access and play games</li>
        <li>Use the App to share content with others</li>
        <li>Use the App to receive notifications and updates</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2">5. User Content</h2>
      <p className="text-base">You are responsible for the content you post on the App. You may not post content that is illegal, harmful, NTSW, or otherwise prohibited by these Terms or any applicable laws and regulations.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">6. Intellectual Property</h2>
      <p className="text-base">You retain ownership of the content you post on the App. We do not claim any intellectual property rights over your content. We own all intellectual property rights over the App itself.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">7. Termination</h2>
      <p className="text-base">You may terminate your account at any time. Termination will result in the immediate deletion of your account and any content you have posted.</p>
      <p className="text-base">We may terminate your account for any reason, including but not limited to unauthorized access, violation of these Terms, or any other reason we deem appropriate.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">8. Disclaimer</h2>
      <p className="text-base">The App is provided on an "as is" and "as available" basis. We make no warranties or representations about the App or its content. We are not responsible for any damages or losses arising from your use of the App.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">9. Limitation of Liability</h2>
      <p className="text-base">We are not liable for any damages or losses arising from your use of the App. You agree to hold us harmless for any damages or losses arising from your use of the App.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">10. Changes to these Terms</h2>
      <p className="text-base">We may update these Terms from time to time. We will notify you by posting the updated Terms on the App.</p>
    </article>
  );
}

