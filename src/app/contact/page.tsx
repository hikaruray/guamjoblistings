import { CONTACT_ADDRESS, CONTACT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with Guam Job Listings — questions about posting a job, applying for work, or a listing that looks wrong.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="mt-2 text-slate-600">
          Got a question? Don&apos;t hesitate to get in touch. Send us an email
          and we will get back to you as soon as we can.
        </p>
      </header>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Email
          </h2>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-2 block break-words text-lg font-medium text-cyan-700 hover:text-cyan-800"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-2 text-sm text-slate-500">
            The fastest way to reach us.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Address
          </h2>
          <p className="mt-2 text-lg font-medium text-slate-800">
            {CONTACT_ADDRESS}
          </p>
        </div>
      </div>

      <section className="mt-10 rounded-2xl bg-slate-100 p-6">
        <h2 className="font-semibold text-slate-900">Before you write</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
          <li>
            <strong className="font-medium text-slate-800">
              Applying for a job?
            </strong>{" "}
            Apply through the listing itself — we cannot pass applications on to
            employers by email.
          </li>
          <li>
            <strong className="font-medium text-slate-800">
              Posting not approved?
            </strong>{" "}
            The reason is on your employer dashboard. Fix that point and submit
            it again.
          </li>
          <li>
            <strong className="font-medium text-slate-800">
              A listing looks wrong or misleading?
            </strong>{" "}
            Please tell us which one. We would rather hear about it than leave it
            up.
          </li>
        </ul>
      </section>
    </div>
  );
}
