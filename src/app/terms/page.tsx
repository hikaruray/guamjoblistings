import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Terms of Use",
  description:
    "The rules for using Guam Job Listings — what employers and jobseekers can expect, and what we do not guarantee.",
  alternates: { canonical: "/terms" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Use</h1>
        <p className="mt-2 text-slate-600">
          By using Guam Job Listings you agree to the following.
        </p>
      </header>

      <div className="mt-8 space-y-8 text-slate-700">
        <Section title="What this site is">
          <p>
            Guam Job Listings is a noticeboard. Employers post openings and
            jobseekers respond to them. We are not an employment agency, we are
            not a party to any hiring decision, and we do not screen or vouch for
            either side beyond reviewing that a posting looks like a genuine
            opening before publishing it.
          </p>
        </Section>

        <Section title="Posting a job">
          <p>
            Post only real openings you are authorised to advertise, with
            accurate pay, location and duties. Do not post multi-level marketing
            schemes, unpaid &quot;opportunities&quot; presented as jobs, requests
            for payment from applicants, or anything unlawful under Guam or
            United States law — including advertisements that discriminate on a
            basis protected by that law.
          </p>
          <p>
            We may decline or remove a posting. Where we decline one, we tell you
            why so it can be corrected and resubmitted.
          </p>
        </Section>

        <Section title="Applying for a job">
          <p>
            Apply honestly and on your own behalf. What you write is sent to the
            employer, so send only what you are willing for them to have.
          </p>
          <p>
            <strong className="font-medium text-slate-900">
              No legitimate employer needs your bank details, a payment, or a
              copy of your ID in order to interview you.
            </strong>{" "}
            If someone who found you through this site asks for any of those,
            stop and{" "}
            <Link href="/contact" className="font-medium text-cyan-700 hover:text-cyan-800">
              tell us
            </Link>
            .
          </p>
        </Section>

        <Section title="Cost">
          <p>
            Posting a job and applying for one are free. Some optional add-ons
            are paid; their price is shown before you pay, and paying for one
            changes only how a posting is displayed. It does not affect whether a
            posting is approved, and it is not a guarantee of applicants or of a
            hire.
          </p>
        </Section>

        {/* Written before taking a single payment, deliberately. Deciding what
            we owe someone after their money is already in our account is how
            you end up deciding it in your own favour. */}
        <Section title="Refunds">
          <p>
            If we remove your posting after you have paid for an add-on on it,
            we refund the unused part of what you paid. If an add-on you paid
            for did not switch on, tell us and we will either apply it or refund
            it in full.
          </p>
          <p>
            We do not refund an add-on that ran for the period you bought
            because the posting did not get the applicants you hoped for — it
            buys where your posting appears, not results. Closing or editing
            your own posting does not pause an add-on: the days keep running,
            so close it when you mean to.
          </p>
          <p>
            Ask by replying to any of our emails, or through the contact page.
            Refunds are returned to the PayPal account that paid.
          </p>
        </Section>

        <Section title="What we do not guarantee">
          <p>
            We do not guarantee that a posting will produce applicants, that an
            application will get a reply, that any listing is accurate, or that
            the site will be available without interruption. Listings are written
            by the employers who post them and are their responsibility.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You keep ownership of what you write. By posting it you allow us to
            display it on this site and to include it in the ordinary operation
            of the service, such as sending an application on to an employer.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            Keep your sign-in details to yourself; you are responsible for what
            happens under your account. We may suspend an account that is used to
            post misleading listings or to misuse the site.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the Territory of Guam.
          </p>
        </Section>

        <Section title="Changes and contact">
          <p>
            We may update these terms; the version on this page is the one that
            applies. Questions go to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-cyan-700 hover:text-cyan-800"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link href="/privacy" className="font-medium text-cyan-700 hover:text-cyan-800">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
