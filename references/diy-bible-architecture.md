# DIY Home Winemaker Bible — Knowledge Architecture

## Source Documents
- `Guide_to_Red_Winemaking.pdf` — MoreWine! / Shea AJ Comfort, 74 pages, 10 chapters
- White wine bible — to be uploaded

## Document Structure (Red Wine Guide)
- Chapter 1: Preparation — sourcing grapes, equipment
- Chapter 2: The Crush (Day 1) — crush, SO2, sugar/acid adjustment, yeast
- Chapter 3: Fermentation (Days 2–14) — cap management, nutrition, temperature, monitoring
- Chapter 4: The Press (Days 7–15) — pressing, transfer to gross lees vessel
- Chapter 5: First Transfer — racking off gross lees, MLF prep
- Chapter 6: MLF (2–4 weeks) — inoculation, management, chromatography
- Chapter 7: Second Transfer Post-MLF — SO2, acid/pH, long-term vessel
- Chapter 8: Ageing/Storage — SO2 management, tasting, transfers
- Chapter 9: Clarifying & Bottling — fining, filtering, final testing, bottling
- Chapter 10: Expanded Info — dilution, chapitalization, acid addition, yeast nutrition, MLF deep-dive, oak, SO2, bench trials, racking, inert gas

## Where These Documents Are Used

### 1. DIY AI Tutor (Free Run — home winemaker mode)
- **Current:** 7 DIY SOPs + keyword/LLM semantic search
- **Proposed:** Bible text chunked into ~500-word passages, stored in `diy_knowledge_chunks` table
- **Retrieval:** Query Router classifies question → semantic search across chunks → top 3 chunks injected as context
- **Effect:** "My ferment stopped at 1.020" → finds Chapter 3.4 "Monitoring the Sugars" + Chapter 10 yeast nutrition section

### 2. DIY Knowledge Hub (/for-home-winemakers/knowledge)
- **Current:** 7 SOPs in category/SOP detail pages
- **Proposed:** Bible chapters become additional "reference" articles alongside SOPs
- **Effect:** Users can browse the full winemaking process in plain English

### 3. Sample Questions on /for-home-winemakers
- **Current:** 6 static hardcoded questions
- **Proposed:** Questions drawn from real chapter headings in the bible — grounded in actual content the AI can answer

### 4. Troubleshooting Guide
- **Current:** Links to /for-home-winemakers/troubleshooting (404)
- **Proposed:** Chapter 10 "Expanded Information" sections become the troubleshooting knowledge base

## Database Schema — diy_knowledge_chunks
```sql
CREATE TABLE diy_knowledge_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_doc VARCHAR(100) NOT NULL,  -- 'red_wine_bible' | 'white_wine_bible'
  chapter VARCHAR(100),
  section VARCHAR(200),
  chunk_text TEXT NOT NULL,
  chunk_index INT,
  wine_type ENUM('red', 'white', 'both') DEFAULT 'both',
  topic_tags VARCHAR(500),  -- comma-separated: 'fermentation,stuck,yeast'
  created_at BIGINT NOT NULL
);
```

## Ingestion Plan
1. Extract full text from PDF using pdftotext (done)
2. Split into ~500-word chunks by chapter/section boundaries
3. Tag each chunk with chapter, section, wine_type, topic_tags
4. Store in diy_knowledge_chunks table
5. Query Router uses LLM to score chunk relevance (same pattern as sopEmbeddings.ts)

## Q&A Page Redesign
- Remove the static "Questions you can ask right now" list of links
- Replace with an **inline chat widget** — user types a question, gets a streaming AI answer right on the page
- The answer is grounded in the bible chunks + DIY SOPs
- Below the chat: show "People also ask" — 3 dynamically generated follow-up questions
- This feels like AI, not a FAQ list
