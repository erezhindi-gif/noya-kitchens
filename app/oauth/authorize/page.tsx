"use client";
import { useEffect, useState } from "react";
import "@/components/quotes/admin.css";

// Claude sends Erez here once, when he adds the quote connector. Right password → back to Claude.
export default function ConnectorSignIn() {
  const [params, setParams] = useState<Record<string, string> | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setParams(Object.fromEntries(new URLSearchParams(window.location.search)));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, password: pw }),
    }).catch(() => null);
    if (res?.ok) {
      const { redirect } = await res.json();
      window.location.href = redirect;
      return;
    }
    setBusy(false);
    const code = await res?.json().then((j) => j.error).catch(() => "");
    setErr(code === "wrong-password" ? "הסיסמה לא נכונה" : "הקישור לא תקין. נסה להוסיף את המחבר מחדש ב-Claude");
  };

  return (
    <div className="nq">
      <div className="nq-login">
        <form onSubmit={submit} className="nq-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA" />
          <h1 style={{ fontSize: 21 }}>חיבור Claude למערכת ההצעות</h1>
          <div className="sub">
            Claude יוכל לחפש בקטלוג, לבנות טיוטות הצעה ולראות את רשימת ההצעות. הוא לא שולח כלום ללקוחות.
          </div>
          <input className="in" type="password" autoComplete="current-password" placeholder="הסיסמה של מערכת ההצעות" value={pw}
            onChange={(e) => setPw(e.target.value)} autoFocus aria-label="סיסמה" />
          {err && <div className="nq-err" role="alert">{err}</div>}
          <button className="nq-btn pri" disabled={busy || !pw || !params}>{busy ? "מתחבר…" : "אישור וחיבור"}</button>
        </form>
      </div>
    </div>
  );
}
