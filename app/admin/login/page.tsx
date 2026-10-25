"use client";
import { useState } from "react";
import "@/components/quotes/admin.css";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const forgot = async () => {
    setResetMsg("שולח…");
    const res = await fetch("/api/admin/reset-request", { method: "POST" }).catch(() => null);
    if (res?.ok) setResetMsg("נשלח מייל עם קישור לאיפוס הסיסמה. הקישור תקף ל-30 דקות.");
    else if (res?.status === 503) setResetMsg("שליחת מיילים עוד לא הוגדרה במערכת. צריך להוסיף מפתח מייל בהגדרות.");
    else setResetMsg("השליחה נכשלה. נסה שוב בעוד דקה.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/admin";
      return;
    }
    setBusy(false);
    setErr(res?.status === 401 ? "הסיסמה לא נכונה" : "יש בעיה בשרת. נסה שוב בעוד רגע");
  };

  return (
    <div className="nq">
      <div className="nq-login">
        <form onSubmit={submit} className="nq-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA" />
          <h1 style={{ fontSize: 22 }}>הצעות מחיר</h1>
          <input className="in" type="password" autoComplete="current-password" placeholder="סיסמה" value={pw}
            onChange={(e) => setPw(e.target.value)} autoFocus aria-label="סיסמה" />
          {err && <div className="nq-err" role="alert">{err}</div>}
          <button className="nq-btn pri" disabled={busy || !pw}>{busy ? "נכנס…" : "כניסה"}</button>
          <button type="button" className="nq-btn ghost" onClick={forgot}>שכחתי סיסמה</button>
          {resetMsg && <div className="hint" role="status">{resetMsg}</div>}
        </form>
      </div>
    </div>
  );
}
