// Brings requests for a quote in from Erez's Gmail: every mail he puts under the "הצעת מחיר" label
// becomes a lead (once), and the client gets an automatic "we got it" reply if that's turned on.
// Once a mail is in, its label changes to "נקלט במערכת", so Gmail itself shows that it was taken.
// Reads through IMAP with the same Gmail app password used for sending quotes.
import { createHash } from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { fillReply, findPhone } from "./leads";
import { gmailTransport, validEmail } from "./send-quote";
import { getData, getSecrets, insertLead, patchSecrets, putLead } from "./store";
import type { Lead } from "./types";

export const LEAD_LABEL = "הצעת מחיר";
export const DONE_LABEL = "נקלט במערכת";
const LOOKBACK_DAYS = 30;
const REPLY_WITHIN_HOURS = 48; // an old mail labeled late doesn't get a "we just got it" reply

const leadId = (msgId: string) => createHash("sha1").update(msgId).digest("hex").slice(0, 16);

/** The client's own words: no quoted earlier messages, no signature blocks, not too long. */
function cleanBody(t: string) {
  const lines: string[] = [];
  for (const line of (t || "").replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(line)) continue;
    if (/^On .+wrote:$|^ב[-־]?.+כתב\/?ה?:$|^-----\s*Original Message/i.test(line.trim())) break;
    if (/^--\s*$/.test(line)) break;
    lines.push(line);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2000);
}

/** Runs the import and records how it went, so the app and the morning mail can warn when it's stuck. */
export async function syncLeads(opts: { force?: boolean; fromSchedule?: boolean } = {}) {
  if (opts.fromSchedule) await patchSecrets({ leadCronAt: Date.now() }).catch(() => {});
  try {
    const r = await importLeads(opts);
    if (r.ok && !("skipped" in r)) await patchSecrets({ leadSyncOkAt: Date.now(), leadSyncError: "" });
    return r;
  } catch (e) {
    console.error("lead sync failed", e);
    const error = /auth|credentials|535|534|AUTHENTICATIONFAILED/i.test(String(e)) ? "gmail-auth" : "sync-failed";
    await patchSecrets({ leadSyncError: error }).catch(() => {});
    return { ok: false as const, error };
  }
}

async function importLeads(opts: { force?: boolean }) {
  const secrets = await getSecrets();
  if (!secrets.gmailPass) return { ok: false as const, error: "no-gmail" };
  // At most once a minute, whatever calls it (app open, scheduled check, Claude).
  if (!opts.force && secrets.lastLeadSync && Date.now() - secrets.lastLeadSync < 60_000) return { ok: true as const, added: 0, skipped: true };
  await patchSecrets({ lastLeadSync: Date.now() });

  const d = await getData();
  const owner = d.settings.email.toLowerCase();
  const known = new Set(d.leads.map((l) => l.msgId).filter(Boolean));
  const client = new ImapFlow({
    host: "imap.gmail.com", port: 993, secure: true,
    auth: { user: d.settings.email, pass: secrets.gmailPass }, logger: false,
  });
  await client.connect();
  const added: Lead[] = [];
  try {
    const boxes = await client.list();
    const has = (n: string) => boxes.some((b) => b.path === n || b.name === n);
    if (!has(DONE_LABEL)) await client.mailboxCreate(DONE_LABEL);
    if (!has(LEAD_LABEL)) {
      await client.mailboxCreate(LEAD_LABEL); // creates the Gmail label on first run
      return { ok: true as const, added: 0, created: true };
    }
    const lock = await client.getMailboxLock(LEAD_LABEL);
    try {
      const uids = (await client.search({ since: new Date(Date.now() - LOOKBACK_DAYS * 864e5) }, { uid: true })) || [];
      if (!uids.length) return { ok: true as const, added: 0 };
      const batch = uids.slice(-40);
      const found: { uid: number; msgId: string; source: Buffer }[] = [];
      const taken: number[] = []; // already a lead from an earlier run: only the label is left to change
      for await (const m of client.fetch(batch, { envelope: true, source: true }, { uid: true })) {
        const msgId = m.envelope?.messageId;
        if (!msgId || !m.source) continue;
        if (known.has(msgId)) taken.push(m.uid);
        else found.push({ uid: m.uid, msgId, source: m.source });
      }
      for (const f of found) {
        const mail = await simpleParser(f.source);
        // A site form or service sends "on behalf of" the client: the reply address is the client.
        let who: { name?: string; address?: string } | undefined = mail.replyTo?.value?.[0] || mail.from?.value?.[0];
        const raw = mail.text || "";
        const fromErez = (who?.address || "").toLowerCase() === owner;
        // Erez forwarded a client's mail to himself: the client is in the forwarded "From:" line.
        if (fromErez) {
          const fw = raw.match(/^(?:From|מאת):\s*(?:"?([^"<\n]*?)"?\s*<)?([^\s<>@]+@[^\s<>]+?)>?\s*$/im);
          who = fw && fw[2].toLowerCase() !== owner ? { name: (fw[1] || "").trim(), address: fw[2] } : { name: "", address: "" };
        }
        const email = (who?.address || "").toLowerCase();
        const text = fromErez ? raw.replace(/\r/g, "").trim().slice(0, 2000) : cleanBody(raw);
        const lead: Lead = {
          id: leadId(f.msgId),
          createdAt: (mail.date || new Date()).toISOString(),
          source: "email",
          name: (who?.name || "").replace(/["']/g, "").trim() || email.split("@")[0] || "",
          phone: findPhone(`${mail.subject || ""}\n${text}`),
          email,
          text,
          subject: mail.subject || "",
          msgId: f.msgId,
        };
        taken.push(f.uid);
        if (!(await insertLead(lead))) continue;
        added.push(lead);

        const fresh = Date.now() - Date.parse(lead.createdAt) < REPLY_WITHIN_HOURS * 36e5;
        const robot = /no-?reply|mailer-daemon|notifications?@/i.test(email);
        if (d.settings.leadAutoReply !== false && d.settings.leadReplyText && fresh && !robot && !fromErez && validEmail(email)) {
          try {
            const body = fillReply(d.settings.leadReplyText, lead.name);
            await gmailTransport(d.settings.email, secrets.gmailPass).sendMail({
              from: { name: "נויה מטבחים", address: d.settings.email },
              to: email,
              subject: /^re:/i.test(lead.subject || "") ? lead.subject : `Re: ${lead.subject || "פנייה לנויה מטבחים"}`,
              text: body,
              html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${body
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`,
              inReplyTo: f.msgId,
              references: f.msgId,
            });
            await putLead({ ...lead, autoReplied: true });
          } catch (e) {
            console.error("lead auto-reply failed", e);
          }
        }
      }
      // In Gmail, moving between label folders swaps the label; the mail stays in the inbox.
      if (taken.length) await client.messageMove(taken, DONE_LABEL, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return { ok: true as const, added: added.length, leads: added };
}

/** Why the import isn't working, in Erez's words — or "" when all is well. */
export function syncProblem(s: { gmailPass?: string; leadSyncError?: string; leadCronAt?: number }, now = Date.now()) {
  if (!s.gmailPass) return "";
  if (s.leadSyncError === "gmail-auth") return "Gmail לא מקבל את סיסמת האפליקציה, ולכן פניות מהמייל לא נקלטות. צריך סיסמת אפליקציה חדשה בהגדרות.";
  if (s.leadSyncError) return "הקליטה האחרונה של פניות מהמייל נכשלה. המערכת תנסה שוב בבדיקה הבאה.";
  if (s.leadCronAt && now - s.leadCronAt > 2 * 36e5)
    return "הבדיקה האוטומטית של המייל לא רצה מעל שעתיים. פניות ייקלטו רק כשתפתח את המערכת.";
  return "";
}
