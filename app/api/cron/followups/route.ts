import { NextRequest, NextResponse } from "next/server";
import { getData, getSecrets, patchSecrets } from "@/lib/quotes/store";
import { calc, fdate, followState, money, qnum, todayIL } from "@/lib/quotes/calc";
import { mailOwner } from "@/lib/quotes/mail";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Daily (vercel.json cron): one email listing the quotes to call back about. Sends at most once a
// day and only to Erez, so a stray call can't do more than repeat that same mail.
export async function GET(req: NextRequest) {
  const today = todayIL();
  const secrets = await getSecrets();
  if (secrets.lastFollowupMail === today) return NextResponse.json({ ok: true, skipped: "already-sent-today" });

  const d = await getData();
  const due = d.quotes.filter((q) => followState(q, d.settings, today).due);
  if (!due.length) return NextResponse.json({ ok: true, due: 0 });

  const origin = req.nextUrl.origin;
  const rows = due
    .sort((a, b) => (a.followUp || "").localeCompare(b.followUp || ""))
    .map((q) => {
      const c = calc(q, d.settings, d.pros);
      return `<li style="margin-bottom:8px"><b>${esc(q.client.name || "ללא שם")}</b> — ${esc(q.project || "")} · ${qnum(q)}
        · ${money(c.total)} כולל מע״מ · נשלחה ${fdate(q.sentAt) || fdate(q.date)}${q.client.phone ? ` · ${esc(q.client.phone)}` : ""}</li>`;
    })
    .join("");
  await mailOwner(
    `${due.length} הצעות ממתינות לחזרה ללקוח`,
    `<p>בוקר טוב ארז,</p><p>ההצעות האלה נשלחו ועוד לא נענו, והגיע מועד המעקב שלהן:</p><ul>${rows}</ul>
     <p><a href="${origin}/admin" style="background:#a8834f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">לרשימת ההצעות</a></p>
     <p style="color:#888;font-size:13px">אחרי שחזרת ללקוח, אפשר לשנות בהצעה את "תאריך מעקב" או את הסטטוס.</p>`
  );
  await patchSecrets({ lastFollowupMail: today });
  return NextResponse.json({ ok: true, due: due.length });
}
