import Link from "next/link";

export const metadata = {
  title: "How It Works",
  description:
    "How to find and apply for jobs on Guam, and how employers post an opening on Guam Job Listings. Posting is free.",
  alternates: { canonical: "/how-it-works" },
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">
        {n}
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-slate-600">{children}</p>
      </div>
    </li>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">How It Works</h1>
        <p className="mt-2 text-slate-600">
          Free for jobseekers. Free for employers. No contracts.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-900">If you are looking for work</h2>
        <ol className="mt-5 space-y-5">
          <Step n={1} title="Browse without an account">
            Search and read every listing freely. Nothing is hidden behind a
            sign-up.
          </Step>
          <Step n={2} title="Sign in with an email link">
            When you find something worth applying for, enter your email and we
            send you a one-time sign-in link. There is no password to create.
            This is only to confirm the address is real, so employers receive
            genuine applications.
          </Step>
          <Step n={3} title="Apply in one short form">
            Your name, email, phone number and a short message to the employer.
            We do not ask you to upload a resume file or build a profile.
          </Step>
          <Step n={4} title="Keep track">
            Everything you have applied for stays on your{" "}
            <Link href="/my/applications" className="font-medium text-cyan-700 hover:text-cyan-800">
              applications page
            </Link>
            , so you can see what you sent and when.
          </Step>
        </ol>
        <Link
          href="/jobs"
          className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
        >
          Browse jobs
        </Link>
      </section>

      <section className="mt-14 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-bold text-slate-900">If you are hiring</h2>
        <ol className="mt-5 space-y-5">
          <Step n={1} title="Create an employer account">
            Email and password, plus your contact name and company details. You
            confirm your email address once, and then you can post.
          </Step>
          <Step n={2} title="Post your opening — free">
            Title, location, category, job type, pay and a description. There is
            no charge and no limit on how many roles you post.
          </Step>
          <Step n={3} title="We review it before it goes live">
            Each posting is read before publication. If something needs changing
            you will see the reason in your dashboard, so you can fix it and
            resubmit rather than wonder what happened.
          </Step>
          <Step n={4} title="It runs for 10 days — renewing is free">
            Short windows keep the board honest: what a jobseeker reads is
            something an employer confirmed recently. We email you before yours
            comes down, and renewing for another 10 days is one click and costs
            nothing. If the role is filled, do nothing and it comes down on its
            own.
          </Step>
          <Step n={5} title="Manage it from your dashboard">
            Edit the posting, close it the moment the role is filled, or reopen
            it if you need to hire again. We email you each time someone applies,
            and you read the application itself — name, phone and message — on
            your dashboard.
          </Step>
          <Step n={6} title="Optional: make it stand out">
            Feature a role to pin it to the top of the job list and the homepage,
            or add an Urgent badge so jobseekers notice it first. Both are bought
            from your dashboard once the posting is live. They buy attention, not
            time — staying on the board is always free.
          </Step>
        </ol>
        <Link
          href="/post-a-job"
          className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
        >
          Post a job
        </Link>
      </section>
    </div>
  );
}
