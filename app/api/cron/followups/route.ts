import { NextRequest, NextResponse } from "next/server";
import { getData, getSecrets, patchSecrets } from "@/lib/quotes/store";
import { calc, fdate, followState, money, qnum, todayIL } from "@/lib/quotes/calc";
import { mailOwner } from "@/lib/quotes/mail";
import { syncLeads } from "@/lib/quotes/lead-sync";
import { ago, leadStage, SOURCE_LABEL } from "@/lib/quotes/leads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Daily (vercel.json cron): one email listing the quotes to call back about. Sends at most once a
// day and only to Erez, so a stray call can't do more than repeat that same mail.
export async function GET(req: NextRequest) {
  const today = todayIL();
  const secrets = await getSecrets();
  if (secrets.lastFollowupMail === today) return NextResponse.json({ ok: true, skipped: "already-sent-today" });

  await syncLeads({ force: true }).catch((e) => console.error("lead sync failed", e));
  const d = await getData();
  const due = d.quotes.filter((q) => followState(q, d.settings, today).due);
  const late = d.leads.filter((l) => leadStage(l, d.quotes).overdue);
  if (!due.length && !late.length) return NextResponse.json({ ok: true, due: 0, leads: 0 });

  const origin = req.nextUrl.origin;
  const rows = due
    .sort((a, b) => (a.followUp || "").localeCompare(b.followUp || ""))
    .map((q) => {
      const c = calc(q, d.settings, d.pros);
      return `<li style="margin-bottom:8px"><b>${esc(q.client.name || "ללא שם")}</b> — ${esc(q.project || "")} · ${qnum(q)}
        · ${money(c.total)} כולל מע״מ · נשלחה ${fdate(q.sentAt) || fdate(q.date)}${q.client.phone ? ` · ${esc(q.client.phone)}` : ""}</li>`;
    })
    .join("");
  const leadRows = late
    .map((l) => `<li style="margin-bottom:8px"><b>${esc(l.name || "ללא שם")}</b> — ${SOURCE_LABEL[l.source]} · ${ago(l.createdAt)}${l.phone ? ` · ${esc(l.phone)}` : ""}<br><span style="color:#666">${esc(l.text.slice(0, 140))}</span></li>`)
    .join("");
  const subject = [late.length ? `${late.length} פניות מחכות להצעה` : "", due.length ? `${due.length} הצעות לחזור עליהן` : ""].filter(Boolean).join(" · ");
  await mailOwner(
    subject,
    `<p>בוקר טוב ארז,</p>${late.length ? `<p><b>פניות שמחכות להצעת מחיר יותר מיומיים:</b></p><ul>${leadRows}</ul>` : ""}
     ${due.length ? `<p><b>הצעות שנשלחו ועוד לא נענו, והגיע מועד המעקב שלהן:</b></p><ul>${rows}</ul>` : ""}
     <p><a href="${origin}/admin" style="background:#a8834f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">לרשימת ההצעות</a></p>
     <p style="color:#888;font-size:13px">אחרי שחזרת ללקוח, אפשר לשנות בהצעה את "תאריך מעקב" או את הסטטוס.</p>`
  );
  await patchSecrets({ lastFollowupMail: today });
  return NextResponse.json({ ok: true, due: due.length, leads: late.length });
}
