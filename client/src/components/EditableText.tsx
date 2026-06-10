/**
 * EditableText — Owner-only inline text editing
 *
 * Usage:
 *   <EditableText contentKey="home.hero.headline" defaultValue="Your cellar's most knowledgeable apprentice." as="h1" className="..." />
 *
 * When the owner is logged in:
 *   - A subtle amber underline appears on hover to indicate the text is editable
 *   - Double-clicking opens an inline textarea for editing
 *   - Press Enter (single-line) or Cmd/Ctrl+Enter (multi-line) to save
 *   - Press Escape to cancel
 *   - Changes are saved to the database immediately
 *
 * For non-owners, the component renders as plain text with no edit affordances.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface EditableTextProps {
  /** Unique key used to store/retrieve the override in the database */
  contentKey: string;
  /** Fallback text shown when no DB override exists */
  defaultValue: string;
  /** HTML element to render as (default: span) */
  as?: React.ElementType;
  /** Additional className passed to the wrapper element */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** If true, renders a textarea for multi-line editing (default: false) */
  multiline?: boolean;
  /** Content map from trpc.siteContent.getAll — pass in to avoid per-component fetches */
  contentMap?: Record<string, string>;
}

export function EditableText({
  contentKey,
  defaultValue,
  as: Tag = "span" as React.ElementType,
  className,
  style,
  multiline = false,
  contentMap,
}: EditableTextProps) {
  const { data: adminData } = trpc.admin.summary.useQuery(undefined, { retry: false });
  const isOwner = !!adminData;

  // Resolve current value from contentMap or fallback
  const resolvedValue = contentMap?.[contentKey] ?? defaultValue;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resolvedValue);
  const [localValue, setLocalValue] = useState(resolvedValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep localValue in sync when contentMap changes
  useEffect(() => {
    const v = contentMap?.[contentKey] ?? defaultValue;
    setLocalValue(v);
    setDraft(v);
  }, [contentMap, contentKey, defaultValue]);

  const setContent = trpc.siteContent.set.useMutation({
    onSuccess: () => {
      setLocalValue(draft);
      setEditing(false);
    },
  });

  const startEdit = useCallback(() => {
    if (!isOwner) return;
    setDraft(localValue);
    setEditing(true);
  }, [isOwner, localValue]);

  const save = useCallback(() => {
    if (draft === localValue) {
      setEditing(false);
      return;
    }
    setContent.mutate({ key: contentKey, value: draft });
  }, [draft, localValue, contentKey, setContent]);

  const cancel = useCallback(() => {
    setDraft(localValue);
    setEditing(false);
  }, [localValue]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  if (!isOwner) {
    return (
      <Tag className={className} style={style}>
        {localValue}
      </Tag>
    );
  }

  if (editing) {
    return (
      <span
        style={{
          display: "inline-block",
          position: "relative",
          width: "100%",
        }}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { cancel(); return; }
            if (!multiline && e.key === "Enter") { e.preventDefault(); save(); return; }
            if (multiline && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); return; }
          }}
          onBlur={save}
          rows={multiline ? 4 : 1}
          style={{
            width: "100%",
            background: "oklch(0.15 0.008 60 / 95%)",
            color: "oklch(0.92 0.018 75)",
            border: "2px solid oklch(0.72 0.12 75)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            lineHeight: "inherit",
            letterSpacing: "inherit",
            resize: "vertical",
            outline: "none",
            boxShadow: "0 0 0 3px oklch(0.72 0.12 75 / 20%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: "-20px",
            right: 0,
            fontSize: "10px",
            color: "oklch(0.72 0.12 75)",
            fontFamily: "sans-serif",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {setContent.isPending ? "Saving…" : multiline ? "Ctrl+Enter to save · Esc to cancel" : "Enter to save · Esc to cancel"}
        </span>
      </span>
    );
  }

  return (
    <Tag
      className={className}
      style={{
        ...style,
        cursor: "text",
        borderBottom: "1px dashed oklch(0.72 0.12 75 / 40%)",
        transition: "border-color 0.15s",
      }}
      onDoubleClick={startEdit}
      title="Double-click to edit"
    >
      {localValue}
    </Tag>
  );
}

/**
 * Hook to load all site content overrides once and pass the map to EditableText components.
 * Use this at the page level to avoid N+1 queries.
 *
 * const { contentMap } = useSiteContent();
 * <EditableText contentKey="home.hero.headline" defaultValue="..." contentMap={contentMap} />
 */
export function useSiteContent() {
  const { data: contentMap = {} } = trpc.siteContent.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });
  return { contentMap };
}
