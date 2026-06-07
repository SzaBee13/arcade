import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
};

export default function LegalOverview() {
  return (
    <section className="mx-auto max-w-4xl p-4 prose prose-invert">
      <div className="text-center">
        <h1>Legal</h1>
        <p>Choose one document in the navbar from above</p>
      </div>
    </section>
  );
}
