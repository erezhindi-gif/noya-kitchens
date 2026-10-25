"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { qnum } from "@/lib/quotes/calc";
import type { Quote, Settings } from "@/lib/quotes/types";
import DocFrame from "./DocFrame";

/** The client's view of their quote: the sheet, a PDF download and the approve form.
 *  `quote` arrives already stripped of prices; the sheet itself is rendered on the server. */
export default function ClientQuote({ quote: q, settings, doc }: { quote: Quote; settings: Settings; doc: React.ReactNode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const approved = q.status === "approved";

  const approve = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErr("");
    const res = await fetch(`/api/q/${q.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) router.refresh();
    else setErr("האישור לא נשלח. בדקו את החיבור ונסו שוב");
  };

  return (
    <div className="nq">
      <div className="nq-client-top">
        <h1 style={{ fontSize: 20 }}>הצעת מחיר מנויה מטבחים</h1>
        <div className="sub">לכבוד {q.client.name}</div>
      </div>
      <div className="nq-wrap">
        <div className="nq-client-acts">
          <a className="nq-btn" href={`/api/q/${q.id}/pdf`} target="_blank" rel="noopener">פתיחה כ-PDF</a>
          <a className="nq-btn" href={`https://wa.me/972${settings.phone.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noopener">שאלה לארז בוואטסאפ</a>
        </div>
        <DocFrame>{doc}</DocFrame>
        <div className="nq-approve nq-card">
          {approved ? (
            <b style={{ color: "var(--ok)" }}>✓ ההצעה אושרה על ידי {q.approvedBy}. ארז יחזור אליכם לתיאום ההזמנה.</b>
          ) : (
            <form className="nq-stack" onSubmit={approve}>
              <h2>אישור ההצעה</h2>
              <div className="sub">אחרי האישור ארז יחזור אליכם לתיאום ההזמנה.</div>
              <div className="row">
                <input className="in" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} aria-label="שם מלא" required minLength={2} />
                <button className="nq-btn pri" disabled={sending || name.trim().length < 2}>{sending ? "שולח…" : "אני מאשר/ת את ההצעה"}</button>
              </div>
            </form>
          )}
          {err && <div className="nq-err" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}
