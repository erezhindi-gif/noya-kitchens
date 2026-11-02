"use client";
// "Leave details and Erez calls back": the request goes into the admin's "פניות" with the channel that brought the visitor.
import { useRef, useState } from "react";
import { currentTouch } from "./SiteTracker";
import { adsLead } from "@/lib/marketing/gads";

const TIMING = ["בחודש הקרוב", "בעוד 1-3 חודשים", "בעוד 3-6 חודשים", "עוד לא יודע/ת"];

export default function ContactForm({ compact = false }: { compact?: boolean }) {
  const started = useRef(Date.now());
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "phone">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = currentTouch();
    setState("sending");
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(f), ch: t.ch, landing: t.landing, ms: Date.now() - started.current }),
    }).catch(() => null);
    if (res?.ok) { adsLead(); return setState("done"); }
    setState(res?.status === 400 ? "phone" : "error");
  };

  if (state === "done")
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-[#E8DCCB]" role="status">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-bold text-lg text-[#2C2C2C]">תודה! הפרטים התקבלו</p>
        <p className="text-[#6b6b6b] mt-1">ארז יחזור אליך בהקדם, בדרך כלל עוד היום.</p>
      </div>
    );

  const field = "w-full rounded-xl border border-[#E0D3C0] bg-white px-4 py-3 text-base text-[#2C2C2C] focus:outline-none focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20";
  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E8DCCB] text-right" noValidate={false}>
      {!compact && <p className="font-bold text-lg text-[#2C2C2C] mb-1">השאירו פרטים וארז יחזור אליכם</p>}
      {!compact && <p className="text-sm text-[#6b6b6b] mb-5">פגישת תכנון והצעת מחיר, בלי התחייבות</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">שם</span>
          <input name="name" required autoComplete="name" placeholder="שם" className={field} />
        </label>
        <label className="block">
          <span className="sr-only">טלפון</span>
          <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="טלפון" className={field} dir="rtl" />
        </label>
        <label className="block">
          <span className="sr-only">עיר</span>
          <input name="city" autoComplete="address-level2" placeholder="עיר / יישוב" className={field} />
        </label>
        <label className="block">
          <span className="sr-only">מתי מתכננים את המטבח</span>
          <select name="timing" defaultValue="" className={field}>
            <option value="" disabled>מתי מתכננים?</option>
            {TIMING.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="block mt-3">
        <span className="sr-only">מה אתם מחפשים</span>
        <textarea name="text" rows={compact ? 2 : 3} placeholder="מה אתם מחפשים? (מטבח, ארונות, מידות בערך…)" className={field} />
      </label>
      {/* hidden from people; bots fill it */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {state === "phone" && <p className="text-sm text-red-700 mt-3" role="alert">צריך מספר טלפון תקין, למשל 050-1234567</p>}
      {state === "error" && <p className="text-sm text-red-700 mt-3" role="alert">השליחה לא הצליחה. אפשר לנסות שוב או להתקשר 050-2808180</p>}
      <button disabled={state === "sending"} className="btn-gold w-full mt-4 justify-center disabled:opacity-60">
        {state === "sending" ? "שולח…" : "שלחו ואחזור אליכם"}
      </button>
    </form>
  );
}
