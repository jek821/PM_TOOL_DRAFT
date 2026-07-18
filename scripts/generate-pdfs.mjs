// One-time (re-runnable) generation of real PDF artifacts for the demo documents.
// Renders each self-contained HTML doc + each timecard image to a Letter-size PDF.
// Output: public/documents/pdf/<id>.pdf   ->   served statically, downloaded by the app.
//
// Run:  node scripts/generate-pdfs.mjs

import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "documents", "pdf");
fs.mkdirSync(outDir, { recursive: true });

const htmlDocs = [
  { id: "sov", file: "documents/schedule-of-values.html" },
  { id: "budget", file: "documents/job-cost-budget.html" },
  { id: "pr1", file: "documents/progress-report-wk1.html" },
  { id: "pr2", file: "documents/progress-report-wk2.html" },
  { id: "pr3", file: "documents/progress-report-wk3.html" },
  { id: "co1", file: "documents/change-order-01.html" },
];

const imageDocs = [
  { id: "wk1-3041", file: "documents/timecards/wk1-3041.png" },
  { id: "wk2-3068", file: "documents/timecards/wk2-3068.png" },
  { id: "wk3-3095", file: "documents/timecards/wk3-3095.png" },
  { id: "decoy-1177", file: "documents/timecards/decoy-1177.png" },
];

const printCss = `
  body { background: #fff !important; }
  .sheet { box-shadow: none !important; margin: 0 auto !important; width: 100% !important; max-width: 100% !important; }
  table, tr, .blk, .idbar, .two, .sign { page-break-inside: avoid; }
`;

const run = async () => {
  const browser = await puppeteer.launch({ headless: "new" });

  for (const d of htmlDocs) {
    const page = await browser.newPage();
    const abs = path.join(root, d.file);
    await page.goto("file://" + abs.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
    await page.addStyleTag({ content: printCss });
    await page.pdf({
      path: path.join(outDir, `${d.id}.pdf`),
      format: "Letter",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    await page.close();
    console.log("pdf:", `${d.id}.pdf`);
  }

  for (const d of imageDocs) {
    const page = await browser.newPage();
    const abs = path.join(root, d.file);
    const b64 = fs.readFileSync(abs).toString("base64");
    await page.setContent(
      `<!doctype html><html><body style="margin:0"><img id="tc" src="data:image/png;base64,${b64}" style="display:block;width:100%"/></body></html>`,
      { waitUntil: "networkidle0" }
    );
    // Size the PDF page to the image's own aspect ratio -> exactly one page, no cutoff.
    const dims = await page.evaluate(() => {
      const i = document.getElementById("tc");
      return { w: i.naturalWidth, h: i.naturalHeight };
    });
    const widthIn = 8.5;
    const heightIn = +(widthIn * (dims.h / dims.w)).toFixed(2);
    await page.pdf({
      path: path.join(outDir, `${d.id}.pdf`),
      width: `${widthIn}in`,
      height: `${heightIn}in`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.close();
    console.log("pdf:", `${d.id}.pdf`, `(8.5 x ${heightIn}in, 1 page)`);
  }

  await browser.close();
  console.log("Done -> public/documents/pdf/");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
