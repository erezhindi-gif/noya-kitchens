// Password login for /admin. Runs in both the edge middleware and Node route handlers, so it
// only uses Web Crypto. The repo is public: the first password never appears here, only its
// SHA-256. Once Erez sets or resets a password it lives (salted, PBKDF2) in the private
// "noyaq.secrets" document, and ADMIN_PASSWORD (if set in Vercel) overrides both.
export const SESSION_COOKIE = "nq_session";
const SESSION_DAYS = 60;
const RESET_MINUTES = 30;

const PASSWORD_SHA256 = "03feef9a30746933c0e36008840308e26e6607454a9094a2bc1a6b512bca551e";

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

function secret() {
  const s = process.env.AUTH_SECRET || process.env.SANITY_API_TOKEN;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : "local-dev-only-secret";
}

async function hmac(data: string) {
  const s = secret();
  if (!s) return null;
  const key = await crypto.subtle.importKey("raw", enc.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Salted PBKDF2 hash for passwords Erez sets himself. */
export async function hashPassword(pw: string, salt?: string) {
  const s = salt || hex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(s), iterations: 150000 }, key, 256);
  return { hash: hex(bits), salt: s };
}

export async function checkPassword(pw: string, stored?: { passHash?: string; passSalt?: string }) {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return safeEqual(await sha256(pw), await sha256(fromEnv));
  if (stored?.passHash && stored.passSalt) return safeEqual((await hashPassword(pw, stored.passSalt)).hash, stored.passHash);
  return safeEqual(await sha256(pw), PASSWORD_SHA256);
}

export async function createSession() {
  const exp = String(Date.now() + SESSION_DAYS * 864e5);
  const sig = await hmac(exp);
  return sig ? { value: `${exp}.${sig}`, maxAge: SESSION_DAYS * 86400 } : null;
}

export async function verifySession(value?: string) {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = await hmac(exp);
  return !!good && safeEqual(sig, good);
}

/* Reset link token. It is bound to the current password hash, so it stops working the moment
   the password changes — a link can be used only once. */
export async function createResetToken(currentHash: string) {
  const exp = String(Date.now() + RESET_MINUTES * 60e3);
  const sig = await hmac(`reset|${exp}|${currentHash}`);
  return sig ? `${exp}.${sig}` : null;
}

export async function verifyResetToken(token: string, currentHash: string) {
  const [exp, sig] = String(token || "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = await hmac(`reset|${exp}|${currentHash}`);
  return !!good && safeEqual(sig, good);
}

export const RESET_LINK_MINUTES = RESET_MINUTES;

/** What a reset link is bound to: the stored hash, or the built-in one before any change. */
export const passwordFingerprint = (s: { passHash?: string }) => s.passHash || PASSWORD_SHA256;

/* ---------- signed payloads for the Claude connector (OAuth codes and tokens) ---------- */
const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64url = (s: string) => Buffer.from(s, "base64url").toString("utf8");

/** A tamper-proof token: base64url(JSON) + "." + HMAC. Nothing is stored server-side. */
export async function signPayload(obj: Record<string, unknown>) {
  const body = b64url(JSON.stringify(obj));
  const sig = await hmac(`nq|${body}`);
  return sig ? `${body}.${sig}` : null;
}

export async function verifyPayload<T extends Record<string, unknown>>(token: string): Promise<T | null> {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = await hmac(`nq|${body}`);
  if (!good || !safeEqual(sig, good)) return null;
  try {
    const obj = JSON.parse(unb64url(body)) as T & { exp?: number };
    if (typeof obj.exp === "number" && obj.exp < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
}

/** Short fingerprint of the current password, so connector tokens die when the password changes. */
export async function passwordStamp(s: { passHash?: string }) {
  return (await sha256(passwordFingerprint(s))).slice(0, 16);
}

export async function sha256b64url(s: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", enc.encode(s))).toString("base64url");
}
