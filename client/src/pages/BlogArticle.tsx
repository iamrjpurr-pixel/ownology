/**
 * BlogArticle — dynamic dispatcher for /blog/:slug
 * Renders the correct article component or a 404 state for unknown slugs.
 */

import { useParams, Link } from "wouter";
import BlogWeightOfHarvest from "./BlogWeightOfHarvest";
import BlogTwoPhilosophies from "./BlogTwoPhilosophies";
import OwnologyLogo from "@/components/OwnologyLogo";

const ARTICLE_MAP: Record<string, React.ComponentType> = {
  "weight-of-harvest": BlogWeightOfHarvest,
  "two-philosophies": BlogTwoPhilosophies,
};

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const ArticleComponent = ARTICLE_MAP[slug ?? ""];

  if (!ArticleComponent) {
    return (
      <div
        style={{
          background: "var(--ow-bg-base)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
        }}
      >
        <OwnologyLogo size={36} />
        <p
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontSize: "1.5rem",
            color: "var(--ow-text-hi)",
            textAlign: "center",
          }}
        >
          Article not found.
        </p>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "1rem",
            color: "var(--ow-text-mid)",
            textAlign: "center",
          }}
        >
          The article you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/blog"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 600,
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
          }}
        >
          ← Back to Cellar Intelligence
        </Link>
      </div>
    );
  }

  return <ArticleComponent />;
}
