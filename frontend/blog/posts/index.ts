import { valoraAIMarginLeakagePost } from "./valora-ai-margin-leakage";

export const allPosts = [valoraAIMarginLeakagePost];

export function getPostBySlug(slug: string) {
  return allPosts.find((post) => post.slug === slug);
}