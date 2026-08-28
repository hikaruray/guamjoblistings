import Link from "next/link";

export const metadata = {
  title: "About Us",
  description:
    "Guam Job Listings is a locally based job board connecting Guam employers with local talent. Posting a job is free.",
  alternates: { canonical: "/about-us" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">About Us</h1>
        <p className="mt-2 text-slate-600">
          Your local connection to Guam&apos;s job market.
        </p>
      </header>

      <div className="mt-8 space-y-6 text-slate-700">
        <p>
          Guam Job Listings is a locally based job board. We are not a global
          site with a Guam page bolted on — the island is the whole point. Every
          listing here is a job on Guam, posted by someone hiring on Guam.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Posting a job is free
          </h2>
          <p className="mt-2">
            Employers can post an opening at no charge, with no listing limit and
            no contract. Optional paid add-ons are available from the employer
            dashboard for anyone who wants a posting to stand out, but nothing
            about hiring here requires payment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Applying is free too
          </h2>
          <p className="mt-2">
            Browsing jobs needs no account at all. To apply, you sign in with a
            one-time link sent to your email — there is no password to remember
            and no profile to fill in. You can see everything you have applied
            to on your applications page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Every listing is reviewed
          </h2>
          <p className="mt-2">
            A new posting does not appear on the site immediately. We read each
            one first and publish it once it looks like a genuine opening. If we
            cannot publish it, the employer is told why so it can be fixed and
            resubmitted. It is a small amount of friction that keeps the board
            worth reading for jobseekers.
          </p>
        </section>

        <p>
          Questions, feedback, or something that looks wrong?{" "}
          <Link href="/contact" className="font-medium text-cyan-700 hover:text-cyan-800">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
