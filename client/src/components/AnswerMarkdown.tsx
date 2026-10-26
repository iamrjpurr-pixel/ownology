import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Markdown for Owen's answers with explicit list/link styling (Tailwind preflight strips both).
export function AnswerMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ul: ({ node: _n, ...p }) => <ul className="my-4 list-disc space-y-2.5 pl-6" {...p} />,
        ol: ({ node: _n, ...p }) => <ol className="my-4 list-decimal space-y-2.5 pl-6" {...p} />,
        li: ({ node: _n, ...p }) => <li className="pl-1" {...p} />,
        p: ({ node: _n, ...p }) => <p className="my-3" {...p} />,
        a: ({ node: _n, href, children: c, ...p }) => (
          <a
            href={href}
            {...p}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
            style={{ color: "var(--ow-amber)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {c}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
