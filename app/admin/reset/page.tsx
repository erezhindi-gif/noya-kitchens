"use client";
import { useEffect, useState } from "react";
import "@/components/quotes/admin.css";

// Opened from the reset mail: choose a new password.
export default function ResetPage() {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg("הסיסמה צריכה להיות לפחות 8 תווים");
    if (pw !== pw2) return setMsg("שתי הסיסמאות לא זהות");
    setBusy(true);
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setDone(true); setMsg(""); }
    else setMsg(res?.status === 400 ? "הקישור לא תקף או שפג תוקפו. בקש קישור חדש ממסך הכניסה." : "יש בעיה בשרת. נסה שוב.");
  };

  return (
    <div className="nq">
      <div className="nq-login">
        <form onSubmit={submit} className="nq-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA" />
          <h1 style={{ fontSize: 22 }}>בחירת סיסמה חדשה</h1>
          {done ? (
            <>
              <div>הסיסמה עודכנה.</div>
              <a className="nq-btn pri" href="/admin/login">לכניסה</a>
            </>
          ) : (
            <>
              <input className="in" type="password" autoComplete="new-password" placeholder="סיסמה חדשה (לפחות 8 תווים)" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="סיסמה חדשה" autoFocus />
              <input className="in" type="password" autoComplete="new-password" placeholder="שוב את הסיסמה החדשה" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="אימות סיסמה" />
              {msg && <div className="nq-err" role="alert">{msg}</div>}
              <button className="nq-btn pri" disabled={busy || !token}>{busy ? "שומר…" : "שמירת הסיסמה"}</button>
              {!token && <div className="hint">חסר קישור איפוס. בקש אותו ממסך הכניסה.</div>}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
