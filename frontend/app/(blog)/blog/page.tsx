import Link from "next/link";
import { allPosts } from "@/blog/posts";

export const metadata = {
  title: "Valora AI Blog",
  description:
    "Insights on restaurant decision intelligence, profitability, operations, and business performance.",
};

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Valora AI Blog</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Insights on restaurant profitability, operations, and decision intelligence.
        </p>
      </div>

      <div className="grid gap-6">
        {allPosts.map((post) => (
          <article
            key={post.slug}
            className="rounded-2xl border border-border/50 bg-background/40 p-6 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{post.publishedAt}</p>
            <h2 className="mt-2 text-2xl font-semibold">{post.title}</h2>
            <p className="mt-3 text-muted-foreground">{post.excerpt}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/50 px-3 py-1 text-xs"
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
      </div>
    </main>
  );
}