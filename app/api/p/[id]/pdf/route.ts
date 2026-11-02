import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "@/lib/quotes/store";
import { countPages, launch } from "@/lib/pdf/chrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The kitchen plan alone as a PDF for the client: drawings and 3D, no prices.
// Public by the plan's unguessable id, like the quote PDF.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const plan = await getPlan(params.id);
  if (!plan) return NextResponse.json({ error: "not-found" }, { status: 404 });

  let browser: Awaited<ReturnType<typeof launch>> | null = null;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("print");
    await page.goto(`${req.nextUrl.origin}/p/${params.id}/print`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector(".nqp-3d[data-ready]", { timeout: 12000 }).catch(() => console.error("3d picture not ready"));

    const print = (withNumbers: boolean) =>
      page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "12mm", left: "0", right: "0" },
        displayHeaderFooter: withNumbers,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="width:100%;text-align:center;font-size:9px;color:#8a7766;font-family:Arial,sans-serif">' +
          '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
    let pdf = await print(true);
    if (countPages(pdf) === 1) pdf = await print(false);

    const name = `תכנון ${plan.title || "מטבח"}${plan.client.name ? ` - ${plan.client.name}` : ""} - נויה מטבחים.pdf`.replace(/[\/:*?"<>|]/g, "");
    const disposition = req.nextUrl.searchParams.get("download") ? "attachment" : "inline";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="plan-${plan.id}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("plan pdf failed", e);
    return NextResponse.json({ error: "pdf-failed" }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
