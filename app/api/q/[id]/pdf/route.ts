import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/quotes/store";
import { qnum } from "@/lib/quotes/calc";
import { countPages, launch } from "@/lib/pdf/chrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PX_PER_MM = 96 / 25.4;
const PAGE_H = 297 * PX_PER_MM;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 12;
const USABLE_H = PAGE_H - (MARGIN_TOP + MARGIN_BOTTOM) * PX_PER_MM;
const SHRINK_UP_TO = 1.4; // a sheet up to 40% longer than a page is shrunk onto one page

// Public by the quote's unguessable id, like the client page. Returns a real PDF (selectable text).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const found = await getQuote(params.id);
  if (!found) return NextResponse.json({ error: "not-found" }, { status: 404 });

  let browser: Awaited<ReturnType<typeof launch>> | null = null;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("print");
    await page.goto(`${req.nextUrl.origin}/q/${params.id}/print`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    // the 3D picture of the kitchen plan is drawn in the page; wait for it, but never fail the PDF over it
    if (found.plan) await page.waitForSelector(".nqp-3d[data-ready]", { timeout: 12000 }).catch(() => console.error("3d picture not ready"));

    // One page when it nearly fits: zoom the sheet down (CSS zoom keeps RTL layout intact), centered.
    const h = await page.evaluate(() => (document.querySelector(".nq-doc") as HTMLElement).scrollHeight);
    if (h > USABLE_H && h <= USABLE_H * SHRINK_UP_TO) {
      const z = Math.max(0.68, (USABLE_H - 8) / h);
      await page.evaluate((zz) => { (document.querySelector(".nq-doc") as HTMLElement).style.zoom = String(zz); }, z);
    }

    const print = (withNumbers: boolean) =>
      page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: `${MARGIN_TOP}mm`, bottom: `${MARGIN_BOTTOM}mm`, left: "0", right: "0" },
        displayHeaderFooter: withNumbers,
        headerTemplate: "<span></span>",
        // Plain digits: the footer can't load the site's Hebrew font.
        footerTemplate:
          '<div style="width:100%;text-align:center;font-size:9px;color:#8a7766;font-family:Arial,sans-serif">' +
          '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
    let pdf = await print(true);
    if (countPages(pdf) === 1) pdf = await print(false); // page numbers only when there's more than one page

    const q = found.quote;
    const name = `הצעת מחיר ${qnum(q)}${q.client.name ? ` - ${q.client.name}` : ""}.pdf`.replace(/[\/:*?"<>|]/g, "");
    const disposition = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="quote-${qnum(q)}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("pdf failed", e);
    return NextResponse.json({ error: "pdf-failed" }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
