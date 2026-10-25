import { NextRequest, NextResponse } from "next/server";
import { approveQuote, getQuote } from "@/lib/quotes/store";
import { calc, money, qnum } from "@/lib/quotes/calc";
import { mailOwner } from "@/lib/quotes/mail";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Public: the client approves their own quote from the link they got on WhatsApp.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { name } = await req.json().catch(() => ({ name: "" }));
  const clean = String(name || "").trim().slice(0, 80);
  if (clean.length < 2) return NextResponse.json({ error: "name-required" }, { status: 400 });
  try {
    const before = await getQuote(params.id);
    if (!before) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const q = await approveQuote(params.id, clean);
    if (!q) return NextResponse.json({ error: "not-found" }, { status: 404 });

    // Tell Erez right away — only on the first approval, and never fail the client's click over it.
    if (before.quote.status !== "approved") {
      const c = calc(q, before.settings, []);
      const link = `${req.nextUrl.origin}/q/${q.id}`;
      await mailOwner(
        `✓ הצעה ${qnum(q)} אושרה על ידי ${clean}`,
        `<p><b>${esc(clean)}</b> אישר/ה את הצעת המחיר <b>${qnum(q)}</b>.</p>
         <p>לקוח: ${esc(q.client.name || "")}${q.client.phone ? ` · ${esc(q.client.phone)}` : ""}<br>
            פרויקט: ${esc(q.project || "")}<br>
            סה״כ כולל מע״מ: <b>${money(c.total)}</b></p>
         <p><a href="${link}" style="background:#a8834f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">לצפייה בהצעה המאושרת</a></p>`
      ).catch((e) => console.error("approval mail failed", e));
    }
    return NextResponse.json({ ok: true, approvedBy: q.approvedBy, approvedAt: q.approvedAt });
  } catch (e) {
    console.error("approveQuote failed", e);
    return NextResponse.json({ error: "approve-failed" }, { status: 500 });
  }
}
