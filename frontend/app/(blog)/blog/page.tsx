import Link from "next/link";
import { allPosts } from "@/blog/posts";

export const metadata = {
  title: "Valora AI Blog",
  description:
    "Insights on restaurant profitability, decision intelligence, operations, and growth.",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="mb-12 border-b border-border/50 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Valora AI
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Insights for operators who want better decisions, not just more dashboards.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          Practical thinking on restaurant profitability, labor, cost control,
          multi-location operations, and decision intelligence.
        </p>
      </section>

      <section className="grid gap-6">
        {allPosts.map((post) => (
          <article
            key={post.slug}
            className="rounded-2xl border border-border/50 bg-background/70 p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm text-muted-foreground">
              {formatDate(post.publishedAt)}
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              <Link
                href={`/blog/${post.slug}`}
                className="transition hover:opacity-80"
              >
                {post.title}
              </Link>
            </h2>

            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {post.excerpt}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm font-medium underline underline-offset-4"
              >
                Read article
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}