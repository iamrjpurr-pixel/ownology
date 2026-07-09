/**
 * Camera Tab — phone-first capture. Photo → Claude Sonnet vision → structured
 * cellar entries. Used for whiteboards, notebooks, and lab printouts.
 */

import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Loader2,
  AlertCircle,
  ScanLine,
} from "lucide-react";
import { assignIds, type ParsedEntry } from "./shared";

export function CameraTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "image") => void;
}) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseFromImage = trpc.vintageLog.parseFromImage.useMutation();

  const handleCapture = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Strip the data URL prefix to get pure base64
      const base64 = dataUrl.split(",")[1];
      setCapturedImage(base64);
      setMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCapture(file);
  };

  const handleParse = async () => {
    if (!capturedImage) return;
    setParsing(true);
    setError(null);
    try {
      const result = await parseFromImage.mutateAsync({
        imageBase64: capturedImage,
        mimeType,
      });
      if (result.entries.length === 0) {
        setError("No cellar entries could be identified in this image. Try a clearer photo or use the Paste tab.");
      } else {
        onEntries(assignIds(result.entries as Omit<ParsedEntry, "id">[]), "image");
      }
    } catch {
      setError("Failed to analyse image. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Phone-first: big camera button */}
      <div
        className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
        style={{
          borderColor: capturedImage ? "color-mix(in oklch, var(--ow-amber) 60%, transparent)" : "oklch(0.35 0.010 60)",
          background: capturedImage ? "var(--ow-bg-raised)" : "var(--ow-bg-base)",
          minHeight: "220px",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {capturedImage ? (
          <img
            src={`data:${mimeType};base64,${capturedImage}`}
            alt="Captured"
            className="max-h-64 rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
            >
              <Camera size={40} style={{ color: "var(--ow-amber)" }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "var(--ow-text-hi)" }}>
                Take a Photo or Scan
              </p>
              <p className="text-sm mt-1" style={{ color: "oklch(0.60 0.012 75)" }}>
                Photograph a notebook, whiteboard, or lab report
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ScanLine size={16} style={{ color: "var(--ow-text-lo)" }} />
              <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
                Tap to open camera or choose a file
              </span>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {capturedImage && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setCapturedImage(null); setError(null); }}
            style={{ borderColor: "oklch(0.30 0.010 60)", color: "var(--ow-text-mid)" }}
          >
            Retake
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleParse}
            disabled={parsing}
            style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
          >
            {parsing ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Analysing…</>
            ) : (
              <><ScanLine size={16} className="mr-2" /> Extract Entries</>
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
        </div>
      )}
    </div>
  );
}
