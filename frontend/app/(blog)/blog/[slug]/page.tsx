import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allPosts, getPostBySlug } from "@/blog/posts";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Valora AI Blog",
    };
  }

  return {
    title: post.seoTitle,
    description: post.metaDescription,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <article className="rounded-2xl border border-border/50 bg-background/40 p-8 shadow-sm">
        <p className="text-sm text-muted-foreground">{post.publishedAt}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">By {post.author}</p>

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

        <div className="mt-8 space-y-6 text-base leading-8 text-foreground/90">
          {post.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}