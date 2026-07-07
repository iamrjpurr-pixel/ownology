/**
 * /call-playbook — private-admin renderer for the cold-call playbook.
 *
 * Fetches /cold-call-playbook.md (a static copy of /app/memory/cold_call_playbook.md
 * living in client/public) and renders it as readable HTML. Print-friendly.
 *
 * Access: NOT linked from public nav. Rich bookmarks it. `noindex` meta blocks
 * search-engine crawling. Not truly secret — obscurity-not-security. If we ever
 * need real access control, wrap it in ownerProcedure and serve via tRPC.
 */
import React from "react";
import { Helmet } from "react-helmet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "wouter";

export default function CallPlaybook() {
  const [md, setMd] = React.useState<string>("");
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");

  React.useEffect(() => {
    fetch("/cold-call-playbook.md")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => { setMd(t); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="call-playbook-page"
    >
      <Helmet>
        <title>Ownology · Cold-Call Playbook (internal)</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "3rem 1.75rem 5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)", textDecoration: "none", letterSpacing: "0.05em" }} data-testid="playbook-home">
            ← ownology.ai
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            data-testid="playbook-print"
            style={{
              background: "transparent",
              border: "1px solid var(--ow-border)",
              padding: "0.35rem 0.65rem",
              borderRadius: "4px",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ow-text-mid)",
              cursor: "pointer",
            }}
          >
            Print
          </button>
        </div>

        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: "0 0 0.4rem" }}>
          Internal · Founder eyes only
        </p>

        {status === "loading" && <p style={{ fontFamily: "'Lato', sans-serif", opacity: 0.6 }}>Loading playbook…</p>}
        {status === "error" && (
          <p style={{ fontFamily: "'Lato', sans-serif", color: "oklch(0.62 0.20 25)" }}>
            Couldn't load the playbook. Raw file: <a href="/cold-call-playbook.md" style={{ color: "var(--ow-amber)" }}>/cold-call-playbook.md</a>
          </p>
        )}
        {status === "ready" && (
          <article className="playbook-body" data-testid="playbook-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </article>
        )}
      </div>

      <style>{`
        .playbook-body {
          font-family: 'Lato', sans-serif;
          font-size: 1rem;
          line-height: 1.65;
          color: var(--ow-text-mid);
        }
        .playbook-body h1 {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 2.5rem;
          line-height: 1.05;
          color: var(--ow-text-hi);
          letter-spacing: -0.015em;
          margin: 0 0 1.5rem;
        }
        .playbook-body h2 {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 1.6rem;
          line-height: 1.15;
          color: var(--ow-text-hi);
          margin: 3rem 0 1rem;
          padding-top: 1.75rem;
          border-top: 1px solid var(--ow-border);
        }
        .playbook-body h3 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 1.2rem;
          color: var(--ow-text-hi);
          margin: 2rem 0 0.5rem;
        }
        .playbook-body p { margin: 0 0 1rem; }
        .playbook-body strong { color: var(--ow-text-hi); }
        .playbook-body em, .playbook-body blockquote em { font-style: italic; }
        .playbook-body ul, .playbook-body ol { padding-left: 1.5rem; margin: 0 0 1.25rem; }
        .playbook-body li { margin-bottom: 0.5rem; line-height: 1.6; }
        .playbook-body blockquote {
          border-left: 3px solid var(--ow-amber);
          margin: 1.25rem 0;
          padding: 0.5rem 0 0.5rem 1.15rem;
          font-family: 'Fraunces', Georgia, serif;
          font-style: italic;
          color: var(--ow-text-hi);
          background: color-mix(in oklch, var(--ow-amber) 4%, transparent);
        }
        .playbook-body code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.9em;
          background: color-mix(in oklch, var(--ow-amber) 6%, transparent);
          padding: 0.1em 0.4em;
          border-radius: 3px;
          color: var(--ow-amber);
        }
        .playbook-body hr {
          border: none;
          border-top: 1px solid var(--ow-border);
          margin: 2.5rem 0;
        }
        .playbook-body a { color: var(--ow-amber); text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }

        @media print {
          .playbook-body { color: #111; font-size: 10.5pt; line-height: 1.5; }
          .playbook-body h1 { color: #111; }
          .playbook-body h2 { color: #111; border-color: #ccc; }
          .playbook-body h3 { color: #111; }
          .playbook-body strong { color: #111; }
          .playbook-body blockquote { border-color: #8a5a2c; background: #fafafa; color: #111; }
          .playbook-body code { background: #fafafa; color: #8a5a2c; }
          [data-testid="playbook-print"], [data-testid="playbook-home"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
