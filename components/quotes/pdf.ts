// Turns the rendered QuoteDoc into an A4 PDF in the browser.
// html-to-image lets the browser itself paint the sheet (via SVG foreignObject), so Hebrew,
// RTL and mixed numbers come out exactly as on screen. Pages break only between [data-pb] blocks.
const PAGE_W = 794; // CSS px of an A4 sheet at 96dpi
const PAGE_H = 1123;
const TOP_GAP = 36; // breathing room at the top of continuation pages

export async function quotePdf(docEl: HTMLElement): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  if (document.fonts?.ready) await document.fonts.ready;

  // Render an unscaled copy off-screen, independent of how the preview is zoomed.
  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_W}px;pointer-events:none`;
  const clone = docEl.cloneNode(true) as HTMLElement;
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
    const bounds = Array.from(clone.querySelectorAll("[data-pb]"))
      .map((e) => e.getBoundingClientRect().bottom - top0)
      .sort((a, b) => a - b);

    const opts = { pixelRatio: 2, backgroundColor: "#ffffff", width: PAGE_W, height: total, cacheBust: false };
    // Safari sometimes paints images/fonts only on the second pass.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) await toCanvas(clone, opts);
    const canvas = await toCanvas(clone, opts);

    const breaks = [0];
    while (total - breaks[breaks.length - 1] > PAGE_H) {
      const start = breaks[breaks.length - 1];
      const room = PAGE_H - (breaks.length > 1 ? TOP_GAP : 0) - 30;
      const fits = bounds.filter((b) => b > start + 150 && b <= start + room);
      breaks.push(fits.length ? fits[fits.length - 1] : start + room);
    }
    breaks.push(total);

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const k = pw / PAGE_W; // pt per CSS px
    const scale = canvas.width / PAGE_W;
    for (let i = 0; i < breaks.length - 1; i++) {
      const y0 = breaks[i];
      const h = breaks[i + 1] - y0;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.ceil(h * scale);
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, Math.floor(y0 * scale), canvas.width, slice.height, 0, 0, slice.width, slice.height);
      if (i > 0) pdf.addPage();
      const top = i > 0 ? TOP_GAP : 0;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, top * k, pw, h * k);
    }
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
