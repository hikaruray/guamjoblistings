import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What Guam Job Listings collects, why, and who sees it. Written from what the site actually does.",
  alternates: { canonical: "/privacy" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-slate-600">
          This describes what the site actually does, not what a template says it
          might do.
        </p>
      </header>

      <div className="mt-8 space-y-8 text-slate-700">
        <Section title="What we collect from jobseekers">
          <p>
            To sign in: your email address. We send a one-time link to it; there
            is no password.
          </p>
          <p>
            When you apply for a job: your name, email address, phone number and
            the message you write to the employer, together with which listing
            you applied to and when.
          </p>
          <p>
            <strong className="font-medium text-slate-900">
              We do not accept resume or document uploads.
            </strong>{" "}
            There is no file to store, and no profile beyond the above.
          </p>
        </Section>

        <Section title="What we collect from employers">
          <p>
            Your email address and password, your contact name, and the company
            details you enter — website, phone number and the contact address for
            the posting. Passwords are handled by our authentication provider and
            are never stored by us in a readable form.
          </p>
        </Section>

        <Section title="Who sees your application">
          <p>
            The employer who posted the job receives it by email at the address
            on that listing. The site owner also receives a copy of every
            application for record-keeping and to resolve disputes.
          </p>
          <p>
            We do not sell your details, and we do not send them to anyone else.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Optional paid add-ons are handled by PayPal. Card details are entered
            on PayPal&apos;s own hosted fields —{" "}
            <strong className="font-medium text-slate-900">
              we never receive or store a card number.
            </strong>{" "}
            What we keep is the PayPal order reference, the amount, what it was
            for, whether it completed, and the email address PayPal reports for
            the payer.
          </p>
        </Section>

        <Section title="Email">
          <p>
            Sign-in links, application confirmations and employer notifications
            are sent through our email provider. They receive the recipient
            address and the message so they can deliver it.
          </p>
        </Section>

        <Section title="Analytics and cookies">
          <p>
            This site runs no analytics or advertising trackers. The only cookies
            set are the ones that keep you signed in after you use a sign-in
            link. There is nothing to opt out of.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Applications and postings are kept while the site operates, so that
            employers and applicants can refer back to them. If you want your
            application or account removed, write to us and we will delete it.
          </p>
          <p className="text-sm text-slate-500">
            Deletion is carried out manually on request; there is no automatic
            purge.
          </p>
        </Section>

        <Section title="Asking us about your data">
          <p>
            Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-cyan-700 hover:text-cyan-800"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            to see what we hold about you, correct it, or have it deleted. See
            also our{" "}
            <Link href="/terms" className="font-medium text-cyan-700 hover:text-cyan-800">
              Terms of Use
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
