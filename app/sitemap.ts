import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://arcade-gate.vercel.app";

return [
  { url: base, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
  { url: `${base}/games/barricade`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${base}/onboarding`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${base}/friends`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${base}/profile`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${base}/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${base}/legal`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${base}/legal/license`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${base}/legal/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${base}/legal/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
];
}
