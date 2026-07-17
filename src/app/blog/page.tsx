import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata = {
  title: "Career & Employment Guide",
  description:
    "Practical guides on working in Guam — minimum wage, payroll, leave, resumes, job applications and more from Guam Job Listings.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Career &amp; Employment Guide
        </h1>
        <p className="mt-2 text-slate-600">
          Practical, plain-language guides on working and hiring in Guam.
        </p>
      </header>

      <ul className="mt-6 divide-y divide-slate-100">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug} className="py-5">
            <Link href={`/${post.slug}`} className="group block">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-700">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(post.date)}
              </p>
              <p className="mt-2 line-clamp-2 text-slate-600">{post.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
