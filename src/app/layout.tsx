import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.guamjoblisting.com"),
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
    url: "https://www.guamjoblisting.com",
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌴</span>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Guam<span className="text-cyan-600">Jobs</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium sm:gap-4">
              <Link
                href="/jobs"
                className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Browse Jobs
              </Link>
              <Link
                href="/post-a-job"
                className="rounded-md bg-cyan-600 px-4 py-2 text-white shadow-sm transition hover:bg-cyan-700"
              >
                Post a Job
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-slate-700">🌴 Guam Job Listings</p>
                <p className="mt-1">Connecting local talent with island employers.</p>
              </div>
              <p>© {new Date().getFullYear()} Guam Job Listings. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
