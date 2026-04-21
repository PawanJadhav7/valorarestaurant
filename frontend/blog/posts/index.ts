import { valoraAIMarginLeakagePost } from "./valora-ai-margin-leakage";
import { fromDashboardToActionPost } from "./from-dashboard-to-action";

export const allPosts = [
  valoraAIMarginLeakagePost,
  fromDashboardToActionPost,
];

export function getPostBySlug(slug: string) {
  return allPosts.find((post) => post.slug === slug);
}