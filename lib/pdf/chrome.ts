// Headless Chrome for the server-made PDFs (quote and kitchen plan): Vercel's bundled Chromium,
// or the Chrome/Edge installed on this computer when running locally.
const LOCAL_CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export async function launch() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL) {
    // Vercel runs Node 24 on Amazon Linux 2023. @sparticuz/chromium picks its bundled system
    // libraries (libnss3, libnspr4…) by the runtime name and only knows 20/22 as AL2023 — anything
    // else gets the old AL2 set and Chromium can't start. Name it 22.x before the module loads.
    process.env.AWS_EXECUTION_ENV = "AWS_Lambda_nodejs22.x";
    process.env.AWS_LAMBDA_JS_RUNTIME = "nodejs22.x";
    const chromium = (await import("@sparticuz/chromium")).default;
    const opts = { args: chromium.args, executablePath: await chromium.executablePath(), headless: true };
    try {
      return await puppeteer.launch(opts);
    } catch (e) {
      // first run on a fresh instance: the unpacked binary can still be busy (ETXTBSY) for a moment
      await new Promise((r) => setTimeout(r, 400));
      return puppeteer.launch(opts);
    }
  }
  const fs = await import("fs");
  const exe = process.env.CHROME_PATH || LOCAL_CHROME.find((p) => fs.existsSync(p));
  return puppeteer.launch({ executablePath: exe, headless: true });
}

export const countPages = (pdf: Uint8Array) => (Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
