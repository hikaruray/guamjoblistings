import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/lib/blog-posts";

// Migrated blog articles live at the site root (same paths as the old
// WordPress site) to preserve SEO — e.g.
// /understanding-401k-plans-benefits-for-employees
// Only the archived slugs are valid; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/${post.slug}` },
    openGraph: {
      title: `${post.title} | Guam Job Listings`,
      description: post.excerpt,
      type: "article",
      url: `/${post.slug}`,
      publishedTime: post.date,
      modifiedTime: post.modified,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.modified,
    author: { "@type": "Organization", name: "Guam Job Listings" },
    publisher: { "@type": "Organization", name: "Guam Job Listings" },
    mainEntityOfPage: `https://www.guamjoblisting.com/${post.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/blog"
        className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        ← All articles
      </Link>

      <header className="mt-4 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold leading-tight text-slate-900">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{formatDate(post.date)}</p>
      </header>

      <div
        className="article-body mt-8"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <div className="mt-12 border-t border-slate-100 pt-6">
        <Link
          href="/jobs"
          className="inline-block rounded-lg bg-cyan-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-cyan-700"
        >
          Browse jobs in Guam
        </Link>
      </div>
    </article>
  );
}
