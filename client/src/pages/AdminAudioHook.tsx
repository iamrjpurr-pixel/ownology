/**
 * /admin/audio-hook — turn any social-media audio clip into a Tier-2
 * "quoted_voice" SMS opener saved against a contact.
 *
 * Why it exists:
 *   Perplexity Sonar is text-only. IG is login-walled. Podcasts, tasting
 *   reels, and TikToks are dark to the AI. But Rich can screen-record
 *   or export the audio manually — and once we have the file, Whisper
 *   transcribes it and Claude proposes hook candidates in Rich's voice.
 *
 * Workflow:
 *   1. Drop an audio file (m4a/mp3/mp4/wav/webm, ≤25MB).
 *   2. Optionally paste source URL (IG post, YouTube, podcast episode) —
 *      becomes hookSourceUrl for later verification.
 *   3. Optionally add context ("this is Matteo from Primo Estate,
 *      pitching the cellar AI tool") — sharpens Claude's angle.
 *   4. Backend runs Whisper → Claude → returns transcript + 3 candidates.
 *   5. Pick one, pick a contact from the list, hit save.
 *   6. Row's hookTier becomes "quoted_voice", hookText + hookSourceUrl
 *      persist, and the SMS template on /admin/contacts + the amber
 *      hero on /hi/:slug automatically use it.
 */
import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Candidate = { angle: string; text: string };

export default function AdminAudioHook() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [context, setContext] = useState("");
  const [transcription, setTranscription] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [status, setStatus] = useState<"idle" | "transcribing" | "done" | "error" | "saving" | "saved">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const contactsQuery = trpc.outreach.list.useQuery();
  const proposeMutation = trpc.outreach.audioHookPropose.useMutation();
  const saveMutation = trpc.outreach.audioHookSave.useMutation();

  const contacts = contactsQuery.data?.contacts ?? [];
  const filteredContacts = useMemo(() => {
    const q = contactFilter.trim().toLowerCase();
    if (!q) return contacts.slice(0, 20);
    return contacts
      .filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          (c.winery ?? "").toLowerCase().includes(q) ||
          (c.lastName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [contacts, contactFilter]);

  async function handleTranscribe() {
    if (!file) return;
    setStatus("transcribing");
    setErrorMsg("");
    setTranscription("");
    setCandidates([]);
    setSelectedText("");
    try {
      const buf = await file.arrayBuffer();
      // Base64-encode in chunks to avoid stack blow-up on large files
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const audioBase64 = btoa(binary);
      const res = await proposeMutation.mutateAsync({
        audioBase64,
        mimeType: file.type || "audio/m4a",
        context: context.trim() || undefined,
      });
      setTranscription(res.transcription);
      setCandidates(res.candidates as Candidate[]);
      setWarnings((res as { transcriptWarnings?: string[] }).transcriptWarnings ?? []);
      if (res.candidates.length > 0) setSelectedText((res.candidates[0] as Candidate).text);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  async function handleSave() {
    if (!selectedSlug || !selectedText) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      await saveMutation.mutateAsync({
        slug: selectedSlug,
        hookText: selectedText,
        hookSourceUrl: sourceUrl.trim() || null,
      });
      setStatus("saved");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function resetAll() {
    setFile(null);
    setSourceUrl("");
    setContext("");
    setTranscription("");
    setCandidates([]);
    setWarnings([]);
    setSelectedText("");
    setSelectedSlug("");
    setContactFilter("");
    setStatus("idle");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/admin/contacts"
          data-testid="back-link"
          style={{ fontSize: "0.8rem", color: "var(--ow-text-mid)", textDecoration: "none" }}
        >
          ← back to contacts
        </Link>
      </div>

      <header style={{ marginBottom: "2rem" }}>
        <h1
          data-testid="audio-hook-title"
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "1.9rem",
            fontWeight: 600,
            color: "var(--ow-amber)",
            margin: 0,
          }}
        >
          Audio hook builder
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", color: "var(--ow-text-mid)", marginTop: "0.5rem", lineHeight: 1.55 }}>
          Drop an IG reel / TikTok / podcast audio → Whisper transcribes → Claude proposes 3 SMS
          openers in your voice → pick one, attach to a contact. Perplexity can&apos;t hear these — this can.
        </p>
      </header>

      {/* STEP 1: Upload */}
      <section
        data-testid="step-upload"
        style={{
          background: "var(--ow-bg-base)",
          border: "1px solid var(--ow-bg-inset)",
          borderRadius: 10,
          padding: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", margin: "0 0 0.75rem", color: "var(--ow-text-hi)" }}>
          1 · Drop audio
        </h2>
        <input
          ref={fileInputRef}
          data-testid="audio-file-input"
          type="file"
          accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={status === "transcribing"}
          style={{
            display: "block",
            width: "100%",
            padding: "0.6rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.85rem",
            color: "var(--ow-text-hi)",
            background: "var(--ow-bg-inset)",
            border: "1px dashed color-mix(in oklch, var(--ow-amber) 30%, transparent)",
            borderRadius: 6,
            marginBottom: "0.75rem",
          }}
        />
        {file && (
          <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.72rem", color: "var(--ow-text-mid)", margin: "0 0 0.75rem" }}>
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}

        <label style={{ display: "block", marginTop: "0.75rem" }}>
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-mid)", display: "block", marginBottom: 4 }}>
            Source URL (optional) — IG post, YouTube, podcast episode. Becomes verify-source link.
          </span>
          <input
            data-testid="source-url-input"
            type="url"
            placeholder="https://instagram.com/p/…"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.7rem",
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.78rem",
              color: "var(--ow-text-hi)",
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: "0.75rem" }}>
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-mid)", display: "block", marginBottom: 4 }}>
            Context (optional) — who this is, what you&apos;re pitching. Sharpens Claude&apos;s angle.
          </span>
          <textarea
            data-testid="context-input"
            rows={2}
            placeholder="e.g. Matteo Grilli from Primo Estate — winemaker/owner. Pitching cellar AI grounded in vintage logs."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.7rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              color: "var(--ow-text-hi)",
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
        </label>

        <button
          data-testid="transcribe-btn"
          onClick={handleTranscribe}
          disabled={!file || status === "transcribing"}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1rem",
            background: !file || status === "transcribing" ? "var(--ow-bg-inset)" : "var(--ow-amber)",
            color: !file || status === "transcribing" ? "var(--ow-text-lo)" : "#1a1200",
            border: "none",
            borderRadius: 4,
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: !file || status === "transcribing" ? "not-allowed" : "pointer",
          }}
        >
          {status === "transcribing" ? "Transcribing + drafting hooks…" : "Transcribe → propose hooks"}
        </button>
        {status === "error" && errorMsg && (
          <p data-testid="error-msg" style={{ marginTop: "0.75rem", color: "#dc2626", fontSize: "0.8rem" }}>
            {errorMsg}
          </p>
        )}
      </section>

      {/* STEP 2: Transcript + candidates */}
      {status === "done" && (
        <section
          data-testid="step-review"
          style={{
            background: "var(--ow-bg-base)",
            border: "1px solid var(--ow-bg-inset)",
            borderRadius: 10,
            padding: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", margin: "0 0 0.75rem", color: "var(--ow-text-hi)" }}>
            2 · Review transcript + pick a hook
          </h2>

          {/* Whisper mishear safety net. Two layers:
              (a) always-on red banner reminding operator to eyeball the transcript
              (b) yellow warning list when Claude flagged specific words it thinks Whisper botched */}
          <div
            data-testid="whisper-safety-banner"
            style={{
              padding: "0.75rem 0.9rem",
              marginBottom: "1rem",
              background: "color-mix(in oklch, #dc2626 12%, transparent)",
              border: "1px solid #dc2626",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              color: "var(--ow-text-hi)",
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: "#dc2626" }}>Read the transcript first.</strong>{" "}
            Whisper occasionally mishears grape varieties (e.g. Grenache → &quot;Coonawarra&quot;),
            winery names, and vineyard names. If a term in a hook feels wrong, DON&apos;T save it —
            edit the hook or process the audio again.
          </div>

          {warnings.length > 0 && (
            <div
              data-testid="claude-warnings"
              style={{
                padding: "0.75rem 0.9rem",
                marginBottom: "1rem",
                background: "color-mix(in oklch, #f59e0b 14%, transparent)",
                border: "1px solid #f59e0b",
                borderRadius: 6,
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.82rem",
                color: "var(--ow-text-hi)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "#f59e0b" }}>⚠ Claude flagged these as possibly mis-transcribed:</strong>
              <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                {warnings.map((w, i) => (
                  <li key={i} style={{ marginBottom: 2 }}><code style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.78rem", background: "var(--ow-bg-inset)", padding: "0 4px", borderRadius: 2 }}>{w}</code></li>
                ))}
              </ul>
            </div>
          )}

          {transcription && (
            <details style={{ marginBottom: "1rem" }} open={candidates.length === 0}>
              <summary style={{ cursor: "pointer", fontSize: "0.78rem", color: "var(--ow-text-mid)", marginBottom: "0.5rem" }}>
                Whisper transcript ({transcription.length} chars)
              </summary>
              <p
                data-testid="transcription"
                style={{
                  padding: "0.75rem",
                  background: "var(--ow-bg-inset)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: 4,
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: "var(--ow-text-hi)",
                  fontStyle: "italic",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {transcription}
              </p>
            </details>
          )}

          {candidates.length === 0 && (
            <p style={{ color: "var(--ow-text-mid)", fontSize: "0.82rem" }}>
              Claude didn&apos;t return any hook candidates — but you have the transcript above. Craft a hook manually and paste it into the box below.
            </p>
          )}

          {candidates.map((c, i) => (
            <label
              key={i}
              data-testid={`candidate-${c.angle}`}
              style={{
                display: "block",
                padding: "0.8rem 0.9rem",
                marginBottom: "0.5rem",
                background: selectedText === c.text ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "var(--ow-bg-inset)",
                border: selectedText === c.text ? "1px solid var(--ow-amber)" : "1px solid var(--ow-border)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="hook-candidate"
                value={c.text}
                checked={selectedText === c.text}
                onChange={() => setSelectedText(c.text)}
                style={{ marginRight: 8 }}
              />
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber)",
                  marginRight: 8,
                }}
              >
                {c.angle.replace(/_/g, " ")}
              </span>
              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.88rem", color: "var(--ow-text-hi)", lineHeight: 1.5 }}>
                {c.text}
              </span>
            </label>
          ))}

          <label style={{ display: "block", marginTop: "1rem" }}>
            <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-mid)", display: "block", marginBottom: 4 }}>
              Final hook text — edit inline if any of the candidates are almost-right.
            </span>
            <textarea
              data-testid="final-hook-textarea"
              rows={3}
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value.slice(0, 400))}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.88rem",
                color: "var(--ow-text-hi)",
                background: "var(--ow-bg-inset)",
                border: "1px solid var(--ow-amber)",
                borderRadius: 4,
                resize: "vertical",
              }}
            />
            <span style={{ fontSize: "0.68rem", color: "var(--ow-text-lo)", fontFamily: "'Fira Code',monospace" }}>
              {selectedText.length}/400 · aim ≤ 140 for the hook portion of the SMS
            </span>
          </label>
        </section>
      )}

      {/* STEP 3: Pick contact + save */}
      {status === "done" && (
        <section
          data-testid="step-save"
          style={{
            background: "var(--ow-bg-base)",
            border: "1px solid var(--ow-bg-inset)",
            borderRadius: 10,
            padding: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", margin: "0 0 0.75rem", color: "var(--ow-text-hi)" }}>
            3 · Attach to a contact
          </h2>

          <input
            data-testid="contact-filter"
            type="text"
            placeholder="Filter by name or winery…"
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.7rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              color: "var(--ow-text-hi)",
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              marginBottom: "0.75rem",
            }}
          />

          <div
            data-testid="contact-list"
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              background: "var(--ow-bg-inset)",
            }}
          >
            {filteredContacts.length === 0 && (
              <p style={{ padding: "1rem", fontSize: "0.82rem", color: "var(--ow-text-lo)", margin: 0 }}>
                No matches. Try a different filter, or head to <Link href="/admin/contacts">/admin/contacts</Link> to add one.
              </p>
            )}
            {filteredContacts.map((c) => (
              <button
                key={c.slug}
                data-testid={`contact-pick-${c.slug}`}
                onClick={() => setSelectedSlug(c.slug)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.6rem 0.75rem",
                  background: selectedSlug === c.slug ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--ow-border)",
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.82rem",
                  color: "var(--ow-text-hi)",
                  cursor: "pointer",
                }}
              >
                <strong>{c.firstName}{c.lastName ? ` ${c.lastName}` : ""}</strong>
                {c.winery && <span style={{ color: "var(--ow-text-mid)" }}> · {c.winery}</span>}
                {(c as { hookText?: string | null }).hookText && (
                  <span style={{ marginLeft: 8, fontSize: "0.68rem", color: "var(--ow-amber)" }}>
                    (hook exists — will overwrite)
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            data-testid="save-btn"
            onClick={handleSave}
            disabled={!selectedSlug || !selectedText || status === "saving"}
            style={{
              marginTop: "1rem",
              padding: "0.7rem 1.25rem",
              background: !selectedSlug || !selectedText || status === "saving" ? "var(--ow-bg-inset)" : "var(--ow-amber)",
              color: !selectedSlug || !selectedText || status === "saving" ? "var(--ow-text-lo)" : "#1a1200",
              border: "none",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: !selectedSlug || !selectedText || status === "saving" ? "not-allowed" : "pointer",
            }}
          >
            {status === "saving" ? "Saving…" : "Save hook to contact"}
          </button>
        </section>
      )}

      {status === "saved" && (
        <section
          data-testid="step-done"
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
            border: "1px solid var(--ow-amber)",
            borderRadius: 10,
            padding: "1.25rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", margin: "0 0 0.5rem", color: "var(--ow-amber)" }}>
            ✓ Saved
          </h2>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-hi)", lineHeight: 1.55, margin: "0 0 1rem" }}>
            Hook attached to <Link href={`/admin/contacts`} style={{ color: "var(--ow-amber)" }}>{selectedSlug}</Link>. The SMS draft
            + <code style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.78rem" }}>/hi/{selectedSlug}</code> now use it automatically.
          </p>
          <button
            data-testid="reset-btn"
            onClick={resetAll}
            style={{
              padding: "0.55rem 1rem",
              background: "var(--ow-bg-inset)",
              color: "var(--ow-text-hi)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Process another audio
          </button>
        </section>
      )}
    </div>
  );
}
