/**
 * VintageCardPDF (DR-16)
 * Generates an LLM-written vintage summary card for a selected batch,
 * then renders it as a printable / shareable PDF.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Loader2, Printer } from "lucide-react";

interface VintageCardPDFProps {
  /** Optional pre-selected batch ID */
  batchId?: string;
}

export default function VintageCardPDF({ batchId }: VintageCardPDFProps) {
  const { data: batches = [] } = trpc.wineBatch.list.useQuery();
  const [selectedBatch, setSelectedBatch] = useState<string>(batchId ?? "");
  const [cardContent, setCardContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateCard = trpc.vintageLog.generateVintageCard.useMutation({
    onSuccess: (data) => {
      setCardContent(data.content);
      setGenerating(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setGenerating(false);
    },
  });

  function handleGenerate() {
    if (!selectedBatch) { toast.error("Select a batch first"); return; }
    setGenerating(true);
    setCardContent(null);
    generateCard.mutate({ batchId: selectedBatch });
  }

  function handlePrint() {
    const batch = batches.find((b) => b.batchId === selectedBatch);
    const win = window.open("", "_blank");
    if (!win || !cardContent) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Vintage Card — ${batch?.tankName ?? selectedBatch}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&family=Fira+Code&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1410;
      color: #e8dcc8;
      font-family: 'Lato', sans-serif;
      font-weight: 300;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      width: 680px;
      background: #201a14;
      border: 1px solid rgba(180,130,60,0.3);
      border-radius: 4px;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, #2a2018 0%, #1a1410 100%);
      border-bottom: 1px solid rgba(180,130,60,0.2);
      padding: 2rem 2.5rem 1.5rem;
    }
    .label {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: rgba(180,130,60,0.7);
      margin-bottom: 0.5rem;
    }
    .winery-name {
      font-family: 'Fraunces', serif;
      font-size: 1.6rem;
      font-weight: 600;
      color: #f0e6cc;
      line-height: 1.1;
    }
    .batch-info {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
    }
    .batch-field { flex: 1; }
    .batch-field .field-label {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(200,170,100,0.6);
      margin-bottom: 0.2rem;
    }
    .batch-field .field-value {
      font-family: 'Fira Code', monospace;
      font-size: 0.85rem;
      color: rgba(180,130,60,0.9);
    }
    .card-body {
      padding: 2rem 2.5rem;
    }
    .card-body p {
      line-height: 1.75;
      color: #c8b898;
      font-size: 0.92rem;
      margin-bottom: 1rem;
    }
    .card-body h2 {
      font-family: 'Fraunces', serif;
      font-size: 1.1rem;
      color: #e8dcc8;
      margin: 1.5rem 0 0.5rem;
    }
    .card-body ul {
      list-style: none;
      padding: 0;
    }
    .card-body ul li {
      padding: 0.3rem 0;
      color: #b8a888;
      font-size: 0.88rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .card-body ul li::before {
      content: '· ';
      color: rgba(180,130,60,0.6);
    }
    .card-footer {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 1rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-brand {
      font-family: 'Fraunces', serif;
      font-size: 0.75rem;
      color: rgba(180,130,60,0.5);
      letter-spacing: 0.08em;
    }
    .footer-date {
      font-size: 0.72rem;
      color: rgba(200,180,140,0.4);
      font-family: 'Fira Code', monospace;
    }
    @media print {
      body { background: #1a1410; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="label">Vintage Card</div>
      <div class="winery-name">${batch?.tankName ?? selectedBatch}</div>
      <div class="batch-info">
        <div class="batch-field">
          <div class="field-label">Batch ID</div>
          <div class="field-value">${batch?.batchId ?? "—"}</div>
        </div>
        <div class="batch-field">
          <div class="field-label">Variety</div>
          <div class="field-value">${batch?.variety ?? "—"}</div>
        </div>
        <div class="batch-field">
          <div class="field-label">Volume</div>
          <div class="field-value">${batch?.volumeLitres ? batch.volumeLitres + " L" : "—"}</div>
        </div>
      </div>
    </div>
    <div class="card-body">
      ${cardContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>').replace(/^/, '<p>').replace(/$/, '</p>')
        .replace(/## (.+)/g, '<h2>$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)/gm, '<li>$1</li>')
        .replace(/(<li>[^]*?<\/li>)/g, '<ul>$1</ul>')}    </div>
    <div class="card-footer">
      <div class="footer-brand">Powered by Ownology</div>
      <div class="footer-date">Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
    win.document.close();
  }

  const batch = batches.find((b) => b.batchId === selectedBatch);

  return (
    <div style={{ fontFamily: "'Lato', sans-serif" }}>
      <div className="flex items-center gap-3 mb-4">
        <FileText size={18} style={{ color: "oklch(0.72 0.12 75)" }} />
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", color: "oklch(0.92 0.018 75)", fontWeight: 600 }}>
          Vintage Card
        </h3>
        <span style={{ fontSize: "0.72rem", color: "oklch(0.50 0.012 75)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          AI-generated · shareable
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger style={{ background: "oklch(0.16 0.010 60)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.82 0.015 75)", width: "220px" }}>
            <SelectValue placeholder="Select a batch…" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.batchId} value={b.batchId}>
                {b.tankName} — {b.variety}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleGenerate} disabled={!selectedBatch || generating}
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}>
          {generating ? <><Loader2 size={14} className="mr-1 animate-spin" /> Generating…</> : "Generate Card"}
        </Button>

        {cardContent && (
          <Button variant="outline" onClick={handlePrint}
            style={{ borderColor: "oklch(0.72 0.12 75 / 40%)", color: "oklch(0.72 0.12 75)", fontFamily: "'Lato', sans-serif" }}>
            <Printer size={14} className="mr-1" /> Print / Save PDF
          </Button>
        )}
      </div>

      {generating && (
        <div className="flex items-center gap-3 py-6" style={{ color: "oklch(0.55 0.015 75)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "oklch(0.72 0.12 75)" }} />
          <span style={{ fontSize: "0.88rem" }}>Composing vintage narrative from your log entries…</span>
        </div>
      )}

      {cardContent && !generating && (
        <div className="rounded-lg p-5" style={{ background: "oklch(0.14 0.010 60)", border: "1px solid oklch(0.72 0.12 75 / 20%)" }}>
          <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.72 0.12 75)" }} />
            <span style={{ fontSize: "0.72rem", color: "oklch(0.55 0.015 75)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {batch?.tankName} · {batch?.variety}
            </span>
          </div>
          <div style={{ color: "oklch(0.78 0.015 75)", fontSize: "0.9rem", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {cardContent}
          </div>
        </div>
      )}
    </div>
  );
}
