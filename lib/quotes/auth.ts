// Password login for /admin. Runs in both the edge middleware and Node route handlers, so it
// only uses Web Crypto. The repo is public: the password itself never appears here, only its
// SHA-256, and ADMIN_PASSWORD (if set in Vercel) overrides it.
export const SESSION_COOKIE = "nq_session";
const SESSION_DAYS = 60;

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

export async function checkPassword(pw: string) {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return safeEqual(await sha256(pw), await sha256(fromEnv));
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
