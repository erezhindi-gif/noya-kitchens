// Turns the rendered QuoteDoc into an A4 PDF in the browser.
// html-to-image lets the browser itself paint the sheet (via SVG foreignObject), so Hebrew,
// RTL and mixed numbers come out exactly as on screen.
// One page whenever possible: a sheet up to ~30% too long is shrunk to fit. Longer quotes break
// only between [data-pb] blocks; every extra page repeats the logo header and pages are numbered.
const PAGE_W = 794; // CSS px of an A4 sheet at 96dpi
const PAGE_H = 1123;
const SHRINK_UP_TO = 1.4;
const FOOT = 40; // room for "עמוד 1 מתוך 2"

export async function quotePdf(docEl: HTMLElement): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  if (document.fonts?.ready) await document.fonts.ready;

  // Render an unscaled copy off-screen, independent of how the preview is zoomed.
  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_W}px;pointer-events:none`;
  const clone = docEl.cloneNode(true) as HTMLElement;
  clone.style.minHeight = "0"; // measure the real content, not the on-screen A4 minimum
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    await Promise.all(
      Array.from(clone.querySelectorAll("img")).map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
      )
    );
    const total = Math.ceil(clone.scrollHeight);
    const top0 = clone.getBoundingClientRect().top;
    const bottomOf = (sel: string) => {
      const e = clone.querySelector(sel);
      return e ? e.getBoundingClientRect().bottom - top0 : 0;
    };
    const bounds = Array.from(clone.querySelectorAll("[data-pb]"))
      .map((e) => e.getBoundingClientRect().bottom - top0)
      .sort((a, b) => a - b);
    const headH = Math.ceil(bottomOf(".nq-d-rule") || bottomOf(".nq-d-head")) + 6;

    const opts = { pixelRatio: 2, backgroundColor: "#ffffff", width: PAGE_W, height: total, cacheBust: false };
    // Safari sometimes paints images/fonts only on the second pass.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) await toCanvas(clone, opts);
    const canvas = await toCanvas(clone, opts);
    const sc = canvas.width / PAGE_W;

    const newPage = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(PAGE_W * sc);
      c.height = Math.round(PAGE_H * sc);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      return { c, ctx };
    };
    const pages: HTMLCanvasElement[] = [];

    if (total <= PAGE_H * SHRINK_UP_TO) {
      // One page: as is, or shrunk just enough to fit.
      const f = Math.min(1, PAGE_H / total);
      const { c, ctx } = newPage();
      const w = c.width * f;
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, (c.width - w) / 2, 0, w, canvas.height * f);
      pages.push(c);
    } else {
      // Several pages, broken between rows; pages after the first start with the logo header.
      const ranges: [number, number][] = [];
      const roomFirst = PAGE_H - FOOT - 10;
      const roomNext = PAGE_H - headH - FOOT - 18;
      let from = 0;
      for (let room = roomFirst; ; room = roomNext) {
        if (total - from <= room) { ranges.push([from, total]); break; }
        const fits = bounds.filter((b) => b > from + 80 && b <= from + room);
        const to = fits.length ? fits[fits.length - 1] : from + room;
        ranges.push([from, to]);
        from = to;
      }
      // A short tail (just the signature, say) joins the page before it, which shrinks a little.
      const last = ranges[ranges.length - 1];
      if (ranges.length > 1 && last[1] - last[0] < 220) {
        ranges.pop();
        ranges[ranges.length - 1][1] = last[1];
      }
      ranges.forEach(([a, b], i) => {
        const { c, ctx } = newPage();
        let y = 0;
        if (i > 0) {
          ctx.drawImage(canvas, 0, 0, canvas.width, headH * sc, 0, 0, c.width, headH * sc);
          y = (headH + 12) * sc;
        }
        const room = i === 0 ? roomFirst : roomNext;
        const f = Math.min(1, room / (b - a)); // only the merged last page ever needs this
        const w = c.width * f;
        ctx.drawImage(canvas, 0, a * sc, canvas.width, (b - a) * sc, (c.width - w) / 2, y, w, (b - a) * sc * f);
        ctx.fillStyle = "#8a7766";
        ctx.font = `${12 * sc}px Heebo, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.direction = "rtl";
        ctx.fillText(`עמוד ${i + 1} מתוך ${ranges.length}`, c.width / 2, (PAGE_H - 18) * sc);
        pages.push(c);
      });
    }

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pages.forEach((c, i) => {
      if (i > 0) pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, ph);
    });
    return pdf.output("blob");
  } finally {
    holder.remove();
  }
}

export function pdfName(num: string, client: string) {
  return `הצעת מחיר ${num}${client ? ` - ${client}` : ""} - נויה מטבחים.pdf`.replace(/[\\/:*?"<>|]/g, "");
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Phone share sheet with the PDF attached (WhatsApp etc.). Returns false when not supported. */
export async function sharePdf(blob: Blob, name: string, text?: string) {
  const file = new File([blob], name, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], text });
  } catch {
    /* the user closed the share sheet */
  }
  return true;
}

/** Opens the PDF in the phone's / browser's own viewer instead of saving it to files.
 *  The window is opened synchronously inside the tap (so it isn't blocked), then pointed at the file. */
export async function openPdf(make: () => Promise<Blob>) {
  const w = window.open("", "_blank");
  if (w) w.document.write('<p style="font-family:Arial;direction:rtl;padding:24px">מכין את ההצעה…</p>');
  try {
    const url = URL.createObjectURL(await make());
    if (w) w.location.href = url;
    else window.location.href = url; // in-app browsers that refuse new windows: open in place
  } catch (e) {
    w?.close();
    throw e;
  }
}
