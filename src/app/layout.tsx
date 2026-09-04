import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { PalmLogo } from "@/components/icons";
import "./globals.css";

export const metadata: Metadata = {
  // Same rule as the sitemap: follow NEXT_PUBLIC_SITE_URL, never a literal.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Guam Job Listings | Find Jobs & Hire in Guam",
    template: "%s | Guam Job Listings",
  },
  description:
    "Guam's local job board for hospitality, food & beverage, water sports, retail and more. Find your next job or post an opening today.",
  keywords: [
    "Guam jobs",
    "jobs in Guam",
    "Guam careers",
    "hospitality jobs Guam",
    "restaurant jobs Guam",
    "hiring Guam",
  ],
  openGraph: {
    title: "Guam Job Listings | Find Jobs & Hire in Guam",
    description:
      "The island's local job board. Find your next job or post an opening today.",
    // Resolved against metadataBase (= NEXT_PUBLIC_SITE_URL). This used to be
    // a literal www.guamjoblisting.com, which quietly overrode metadataBase and
    // advertised the old WordPress domain as the canonical URL.
    url: "/",
    siteName: "Guam Job Listings",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guam Job Listings",
    description: "Find your next job in Guam, or hire local talent.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-800">
        <SiteHeader />

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 font-semibold text-slate-700">
                  <PalmLogo className="h-5 w-5 text-cyan-600" />
                  Guam Job Listings
                </p>
                <p className="mt-1">Connecting local talent with island employers.</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <Link href="/jobs" className="hover:text-slate-700">
                    Browse Jobs
                  </Link>
                  <Link href="/my/applications" className="hover:text-slate-700">
                    My Applications
                  </Link>
                  <Link href="/employer/login" className="hover:text-slate-700">
                    Employers
                  </Link>
                  <Link href="/blog" className="hover:text-slate-700">
                    Guides
                  </Link>
                  <Link href="/how-it-works" className="hover:text-slate-700">
                    How It Works
                  </Link>
                  <Link href="/about-us" className="hover:text-slate-700">
                    About
                  </Link>
                  <Link href="/faq" className="hover:text-slate-700">
                    FAQ
                  </Link>
                  <Link href="/contact" className="hover:text-slate-700">
                    Contact
                  </Link>
                  <Link href="/privacy" className="hover:text-slate-700">
                    Privacy
                  </Link>
                  <Link href="/terms" className="hover:text-slate-700">
                    Terms
                  </Link>
                </p>
              </div>
              <p>© {new Date().getFullYear()} Guam Job Listings. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
