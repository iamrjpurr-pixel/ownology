import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [tot] = await c.execute("SELECT COUNT(*) AS c FROM diy_knowledge_chunks");
const [pub] = await c.execute("SELECT COUNT(*) AS c FROM diy_knowledge_chunks WHERE published = 1");
const [src] = await c.execute(`
  SELECT
    CASE
      WHEN source_doc LIKE 'au_regulations__%' THEN 'au_regulations'
      WHEN source_doc LIKE 'au_equipment__%' THEN 'au_equipment'
      WHEN source_doc LIKE 'oenology_education__%' THEN 'oenology_education'
      ELSE source_doc
    END AS source,
    COUNT(*) AS c,
    SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) AS pub
  FROM diy_knowledge_chunks
  GROUP BY source
  ORDER BY c DESC
`);
const [sops] = await c.execute("SELECT COUNT(*) AS c FROM sop_library");
const [cj] = await c.execute("SELECT COUNT(*) AS c FROM cellar_journal");
console.log(`TOTAL diy_knowledge_chunks: ${tot[0].c} (${pub[0].c} published)`);
console.log("By source:");
for (const r of src) {
  console.log(`  ${r.source}: ${r.c} total, ${r.pub} published`);
}
console.log(`\nsop_library: ${sops[0].c}`);
console.log(`cellar_journal: ${cj[0].c}`);
await c.end();
