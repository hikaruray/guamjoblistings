import Link from "next/link";

export const metadata = {
  title: "FAQ",
  description:
    "Common questions about posting jobs and applying for work on Guam Job Listings — cost, accounts, review times and resumes.",
  alternates: { canonical: "/faq" },
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does it cost anything to post a job?",
    a: (
      <>
        No. Posting is free, with no limit on the number of roles and no
        contract. Optional paid add-ons are available from the employer
        dashboard if you want a listing to stand out, but a free posting appears
        on the board like any other.
      </>
    ),
  },
  {
    q: "Do I need an account to look at jobs?",
    a: <>No. Browsing and reading every listing is open to everyone.</>,
  },
  {
    q: "Do I need a password to apply?",
    a: (
      <>
        No. You enter your email and we send a one-time sign-in link. This
        confirms the address is real so employers receive genuine applications.
      </>
    ),
  },
  {
    q: "Can I upload a resume?",
    a: (
      <>
        Not at the moment. An application is your name, email, phone number and a
        short message to the employer. If the employer wants a resume, they will
        ask you for it directly.
      </>
    ),
  },
  {
    q: "How long before my job posting appears?",
    a: (
      <>
        Every posting is read before it is published, so it is not instant. Once
        approved it appears on the board and in search straight away.
      </>
    ),
  },
  {
    q: "My posting was not approved. Why?",
    a: (
      <>
        The reason is shown on your employer dashboard next to the posting. Fix
        the point raised and submit it again — there is no penalty and no extra
        cost.
      </>
    ),
  },
  {
    q: "How long does a listing stay up?",
    a: (
      <>
        Until you close it. There is no automatic expiry date, so a role stays
        visible while you are still hiring. You can close it from your dashboard
        the moment it is filled, and reopen it later if you need to.
      </>
    ),
  },
  {
    q: "How do I receive applications?",
    a: (
      <>
        By email, at the address on the posting, as each application arrives.
      </>
    ),
  },
  {
    q: "Are the jobs all on Guam?",
    a: <>Yes. That is the entire point of the site.</>,
  },
  {
    q: "Something looks wrong with a listing.",
    a: (
      <>
        Please{" "}
        <Link href="/contact" className="font-medium text-cyan-700 hover:text-cyan-800">
          tell us
        </Link>
        . We would rather hear about it than leave it up.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-slate-600">
          If your question is not here,{" "}
          <Link href="/contact" className="font-medium text-cyan-700 hover:text-cyan-800">
            send us a message
          </Link>
          .
        </p>
      </header>

      <div className="mt-6 divide-y divide-slate-100">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
              <span className="mr-2 inline-block text-cyan-600 transition group-open:rotate-90">
                &rsaquo;
              </span>
              {item.q}
            </summary>
            <p className="mt-2 pl-6 text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
