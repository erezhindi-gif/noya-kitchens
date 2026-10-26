"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STATUS_LABEL, UNIT_LABEL, ancestors, calc, descendantIds, fdate, kids, leafCount, lineFrom, lineTotal,
  autoDesc, commissionsOf, defaultCommissions, followState, markSentFields, tidyLineDesc, composeDesc, label, money, pathPrice, priceOf, normalizeCat, optPrice, pathOf, tidyCat, qnum, todayIL, uid, waLink,
} from "@/lib/quotes/calc";
import type { AppData, CatNode, CatOption, Line, LineType, Pro, Quote, Settings, Status } from "@/lib/quotes/types";
import QuoteDoc from "./QuoteDoc";
import DocFrame from "./DocFrame";
import { downloadBlob, pdfName, quotePdf, sharePdf } from "./pdf";
import "./admin.css";

type View = "list" | "edit" | "preview" | "catalog" | "settings";
type SaveState = "idle" | "saving" | "saved" | "error";

const LINE_TAG: Record<Exclude<LineType, "cat">, string> = {
  free: "שורה חופשית", lump: "מחיר כולל", text: "שורת טקסט", head: "כותרת אזור",
};

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

/* Browser backup of every quote edit, kept until the server confirms the same version.
   If a save never reached the server (refresh, lost connection), the next load restores it. */
const BK = "nq-bk-";
const backup = (q: Quote) => { try { localStorage.setItem(BK + q.id, JSON.stringify(q)); } catch {} };
const dropBackup = (id: string, ifSame?: Quote) => {
  try {
    if (!ifSame || localStorage.getItem(BK + id) === JSON.stringify(ifSame)) localStorage.removeItem(BK + id);
  } catch {}
};
function readBackups(): Quote[] {
  const out: Quote[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(BK)) { try { out.push(JSON.parse(localStorage.getItem(k)!)); } catch {} }
    }
  } catch {}
  return out;
}

export default function AdminApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState<View>("list");
  const [curId, setCurId] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [toast, setToast] = useState("");
  // The quote Erez was working on, so the catalog and settings screens can send him straight back to it.
  const [openId, setOpenId] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef(0);

  useEffect(() => {
    api("/api/admin/data", "GET")
      .then((d: AppData) => {
        const restored: Quote[] = [];
        for (const b of readBackups()) {
          const srv = d.quotes.find((q) => q.id === b.id);
          if (!srv || (b.updatedAt || "") > (srv.updatedAt || "")) {
            d.quotes = srv ? d.quotes.map((q) => (q.id === b.id ? b : q)) : [...d.quotes, b];
            restored.push(b);
          } else dropBackup(b.id);
        }
        d.quotes = d.quotes.map((q) => ({ ...q, lines: q.lines.map((l) => (l.type === "cat" ? { ...l, desc: tidyLineDesc(l) } : l)) }));
        setData({ ...d, cat: normalizeCat(tidyCat(d.cat)) });
        for (const b of restored)
          api(`/api/admin/quotes/${b.id}`, "PUT", b).then(() => dropBackup(b.id, b)).catch(() => setSave("error"));
        let last: string | null = null;
        try { last = localStorage.getItem("nq-open"); } catch {}
        // a link from Claude (…/admin?q=<id>) opens that quote directly
        const fromLink = new URLSearchParams(window.location.search).get("q");
        if (fromLink) last = fromLink;
        if (last && d.quotes.some((q) => q.id === last)) {
          setOpenId(last);
          setView("edit");
          setCurId(last);
          history.replaceState({ view: "edit", curId: last }, "");
        }
      })
      .catch(() => setLoadErr("לא הצלחתי לטעון את הנתונים. רענן את העמוד."));
  }, []);

  // Phone back button moves between screens instead of leaving the app.
  useEffect(() => {
    history.replaceState({ view: "list", curId: null }, "");
    const onPop = (e: PopStateEvent) => {
      if (!e.state) return;
      setView(e.state.view);
      setCurId(e.state.curId);
    };
    addEventListener("popstate", onPop);
    const onLeave = (e: BeforeUnloadEvent) => {
      if (pending.current > 0) e.preventDefault();
    };
    addEventListener("beforeunload", onLeave);
    // Leaving or refreshing: send whatever is still waiting, without waiting for the debounce.
    const flush = () => {
      const d = dataRef.current;
      if (!d) return;
      for (const key of Object.keys(timers.current)) {
        clearTimeout(timers.current[key]);
        delete timers.current[key];
        const send = (path: string, body: unknown) =>
          fetch(path, { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
        if (key.startsWith("q:")) {
          const q = d.quotes.find((x) => x.id === key.slice(2));
          if (q) send(`/api/admin/quotes/${q.id}`, q);
        } else if (key === "cat") send("/api/admin/catalog", d.cat);
        else if (key === "settings") send("/api/admin/settings", { settings: d.settings, pros: d.pros });
      }
      pending.current = 0;
    };
    addEventListener("pagehide", flush);
    return () => {
      removeEventListener("pagehide", flush);
      removeEventListener("popstate", onPop);
      removeEventListener("beforeunload", onLeave);
    };
  }, []);

  // Live updates: pick up approvals and changes made elsewhere without a refresh.
  useEffect(() => {
    const pull = async () => {
      if (document.hidden || pending.current > 0 || !dataRef.current) return;
      const d: AppData | null = await fetch("/api/admin/data", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!d || pending.current > 0 || !dataRef.current) return;
      const cur = dataRef.current;
      const newlyApproved = d.quotes.filter((q) => q.status === "approved" && cur.quotes.find((x) => x.id === q.id)?.status !== "approved");
      const quotes = d.quotes.map((sq) => {
        const lq = cur.quotes.find((x) => x.id === sq.id);
        return lq && (lq.updatedAt || "") > (sq.updatedAt || "") ? lq : sq; // keep newer local edits
      });
      // quotes created here that the server hasn't returned yet stay
      for (const lq of cur.quotes) if (!quotes.some((q) => q.id === lq.id) && timers.current["q:" + lq.id]) quotes.push(lq);
      const next = { ...cur, quotes };
      dataRef.current = next;
      setData(next);
      if (newlyApproved.length)
        flash(newlyApproved.map((q) => `✓ ${qnum(q)} אושרה על ידי ${q.approvedBy}`).join(" · "));
    };
    const t = setInterval(pull, 60_000);
    const onVis = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback((v: View, id: string | null = null) => {
    setView(v);
    setCurId(id);
    if ((v === "edit" || v === "preview") && id) {
      setOpenId(id);
      try { localStorage.setItem("nq-open", id); } catch {}
    }
    history.pushState({ view: v, curId: id }, "");
    window.scrollTo(0, 0);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  /* ---------- debounced saving ---------- */
  const schedule = useCallback((key: string, run: (d: AppData) => Promise<unknown>, delay = 700) => {
    if (!timers.current[key]) pending.current++;
    clearTimeout(timers.current[key]);
    setSave("saving");
    timers.current[key] = setTimeout(async () => {
      delete timers.current[key];
      try {
        await run(dataRef.current!);
        pending.current--;
        if (pending.current === 0) setSave("saved");
      } catch {
        pending.current--;
        setSave("error");
      }
    }, delay);
  }, []);

  const saveQuoteLater = (id: string, delay?: number) =>
    schedule("q:" + id, (d) => {
      const q = d.quotes.find((x) => x.id === id);
      return q ? api(`/api/admin/quotes/${id}`, "PUT", q).then(() => dropBackup(id, q)) : Promise.resolve();
    }, delay);

  const updQuote = (id: string, fn: (q: Quote) => void, delay?: number) => {
    setData((d) => {
      if (!d) return d;
      const quotes = d.quotes.map((q) => {
        if (q.id !== id) return q;
        const c = structuredClone(q);
        fn(c);
        c.updatedAt = new Date().toISOString();
        backup(c);
        return c;
      });
      const next = { ...d, quotes };
      dataRef.current = next;
      return next;
    });
    saveQuoteLater(id, delay);
  };

  const updCat = (fn: (cat: CatNode[]) => CatNode[]) => {
    setData((d) => {
      if (!d) return d;
      const next = { ...d, cat: normalizeCat(fn(structuredClone(d.cat))) };
      dataRef.current = next;
      return next;
    });
    schedule("cat", (d) => api("/api/admin/catalog", "PUT", d.cat));
  };

  const updSettings = (fn: (s: Settings, pros: Pro[]) => { settings?: Settings; pros?: Pro[] } | void) => {
    setData((d) => {
      if (!d) return d;
      const s = structuredClone(d.settings);
      const p = structuredClone(d.pros);
      const r = fn(s, p) || {};
      const next = { ...d, settings: r.settings || s, pros: r.pros || p };
      dataRef.current = next;
      return next;
    });
    schedule("settings", (d) => api("/api/admin/settings", "PUT", { settings: d.settings, pros: d.pros }));
  };

  const saveNow = async (id: string) => {
    if (timers.current["q:" + id]) {
      clearTimeout(timers.current["q:" + id]);
      delete timers.current["q:" + id];
      pending.current = Math.max(0, pending.current - 1);
    }
    const q = dataRef.current?.quotes.find((x) => x.id === id);
    if (q) await api(`/api/admin/quotes/${id}`, "PUT", q).then(() => dropBackup(id, q));
    if (pending.current === 0) setSave("saved");
  };

  const newQuote = (from?: Quote, message?: string) => {
    if (!data) return;
    const date = todayIL();
    const seq = (dataRef.current || data).quotes.filter((q) => q.date === date).reduce((m, q) => Math.max(m, q.seq), 0) + 1;
    const base: Omit<Quote, "id" | "date" | "seq" | "status"> = from
      ? structuredClone({ ...from, approvedBy: undefined, approvedAt: undefined, sentAt: undefined, followUp: undefined })
      : { client: { name: "", phone: "" }, project: "", lines: [], pros: [], commissions: defaultCommissions(data.settings), round: true, delivery: "אספקה 45 ימי עבודה", notes: "" };
    const q: Quote = { ...base, id: uid(12), date, seq, status: "draft", updatedAt: new Date().toISOString() };
    q.lines = q.lines.map((l) => ({ ...l, id: uid() }));
    backup(q);
    setData((d) => {
      const next = d ? { ...d, quotes: [...d.quotes, q] } : d;
      dataRef.current = next;
      return next;
    });
    saveQuoteLater(q.id, 0);
    go("edit", q.id);
    flash(message ? `${message} ${qnum(q)}` : from ? `שוכפלה להצעה ${qnum(q)}` : `נפתחה הצעה ${qnum(q)}`);
  };

  const removeQuote = async (id: string) => {
    // Cancel a waiting save, or it would recreate the quote right after the delete.
    if (timers.current["q:" + id]) {
      clearTimeout(timers.current["q:" + id]);
      delete timers.current["q:" + id];
      pending.current = Math.max(0, pending.current - 1);
    }
    try {
      await api(`/api/admin/quotes/${id}`, "DELETE");
      dropBackup(id);
      setData((d) => (d ? { ...d, quotes: d.quotes.filter((q) => q.id !== id) } : d));
      if (openId === id) { setOpenId(null); try { localStorage.removeItem("nq-open"); } catch {} }
      go("list");
      flash("ההצעה נמחקה");
    } catch {
      flash("המחיקה נכשלה. נסה שוב");
    }
  };

  if (loadErr) return <div className="nq"><div className="nq-wrap"><div className="nq-empty">{loadErr}</div></div></div>;
  if (!data) return <div className="nq"><div className="nq-wrap"><div className="nq-empty">טוען…</div></div></div>;

  const q = curId ? data.quotes.find((x) => x.id === curId) : undefined;
  const tab = view === "catalog" || view === "settings" ? view : "list";

  return (
    <div className="nq nq-admin">
      <header className="nq-top">
        <div className="nq-top-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quote-logo.png" alt="NOYA" />
          <nav className="nq-tabs">
            <button aria-current={tab === "list"} onClick={() => go("list")}>הצעות</button>
            <button aria-current={tab === "catalog"} onClick={() => go("catalog")}>קטלוג</button>
            <button aria-current={tab === "settings"} onClick={() => go("settings")}>הגדרות</button>
          </nav>
          <span className={`nq-save ${save === "error" ? "err" : ""}`}>
            {save === "saving" ? "שומר…" : save === "saved" ? "נשמר ✓" : save === "error" ? "השמירה נכשלה, בדוק חיבור" : ""}
          </span>
        </div>
      </header>

      <main className="nq-wrap">
        {view === "list" && <ListView data={data} onOpen={(id) => go("edit", id)} onNew={() => newQuote()} onDup={(q) => newQuote(q)} onDelete={removeQuote}
          onAgent={(d) => newQuote({ ...d, pros: [], commissions: defaultCommissions(data.settings), round: false } as unknown as Quote, "טיוטה מהסוכן נפתחה:")} />}
        {view === "edit" && q && (
          <Editor
            data={data} q={q} upd={(fn, delay) => updQuote(q.id, fn, delay)}
            onPreview={() => go("preview", q.id)} onBack={() => go("list")}
            onDup={() => newQuote(q)} onDelete={() => removeQuote(q.id)} flash={flash}
          />
        )}
        {view === "preview" && q && (
          <Preview data={data} q={q} onBack={() => go("edit", q.id)} flash={flash} saveNow={() => saveNow(q.id)}
            markSent={() => q.status === "draft" && updQuote(q.id, (x) => markSentFields(x), 0)} />
        )}
        {(view === "catalog" || view === "settings") && openId && data.quotes.some((x) => x.id === openId) && (() => {
          const oq = data.quotes.find((x) => x.id === openId)!;
          return (
            <div className="nq-back">
              <span>עובד על הצעה <b className="ltr">{qnum(oq)}</b>{oq.client.name ? ` · ${oq.client.name}` : ""}</span>
              <button className="nq-btn sm pri" onClick={() => go("edit", openId)}>חזרה להצעה ›</button>
            </div>
          );
        })()}
        {view === "catalog" && <CatalogView cat={data.cat} upd={updCat} />}
        {view === "settings" && <SettingsView data={data} upd={updSettings} />}
        {(view === "edit" || view === "preview") && !q && <div className="nq-empty">ההצעה לא נמצאה</div>}
      </main>
      {toast && <div className="nq-toast" role="status">{toast}</div>}
    </div>
  );
}

/** Opens a new Claude chat (app or site) with the start of the request typed in; Erez dictates the rest there. */
const claudeLink = (start: string) => `https://claude.ai/new?q=${encodeURIComponent(start)}`;

/* =================== list =================== */
function ListView({ data, onOpen, onNew, onDup, onDelete, onAgent }: { data: AppData; onOpen: (id: string) => void; onNew: () => void; onDup: (q: Quote) => void; onDelete: (id: string) => void; onAgent: (d: AgentDraft) => void }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all" | "follow">("all");
  const [term, setTerm] = useState("");
  const rows = useMemo(() => data.quotes.map((q) => ({ q, c: calc(q, data.settings, data.pros) })), [data]);
  const open = rows.filter((x) => x.q.status === "sent");
  const won = rows.filter((x) => x.q.status === "approved");
  const decided = rows.filter((x) => x.q.status === "approved" || x.q.status === "rejected").length;
  const t = term.trim();
  const fs = (q: Quote) => followState(q, data.settings);
  const dueCount = rows.filter((x) => fs(x.q).due).length;
  const shown = rows
    .filter((x) => filter === "all" || (filter === "follow" ? fs(x.q).due : x.q.status === filter))
    .filter((x) => !t || `${x.q.client.name} ${x.q.project} ${qnum(x.q)} ${x.q.client.phone}`.includes(t))
    .sort((a, b) => qnum(b.q).localeCompare(qnum(a.q)));

  return (
    <>
      <div className="nq-head">
        <div><h1>הצעות מחיר</h1><div className="sub">החדשות למעלה</div></div>
        <div className="nq-head-acts">
          <a className="nq-btn" href={claudeLink("הצעת מחיר חדשה במערכת נויה: ")} target="_blank" rel="noopener">✨ הצעה בקלוד</a>
          <a className="nq-btn" href={claudeLink("שינוי בהצעה קיימת במערכת נויה. תציג לי את ההצעות האחרונות ותשאל איזו לשנות.")} target="_blank" rel="noopener">✨ שינוי בקלוד</a>
          <button className="nq-btn pri" onClick={onNew}>+ הצעה חדשה</button>
        </div>
        {agentOpen && <AgentModal onClose={() => setAgentOpen(false)} onDraft={(d) => { setAgentOpen(false); onAgent(d); }} />}
      </div>
      <div className="nq-kpis">
        <div className="nq-kpi"><div className="k">ממתינות לתשובה</div><div className="v num">{open.length}{dueCount ? <span className="nq-due-k"> · {dueCount} לחזור</span> : null}</div></div>
        <div className="nq-kpi"><div className="k">שווי הצעות פתוחות</div><div className="v num">{money(open.reduce((s, x) => s + x.c.price, 0))}</div></div>
        <div className="nq-kpi"><div className="k">אושרו</div><div className="v num">{money(won.reduce((s, x) => s + x.c.price, 0))}</div></div>
        <div className="nq-kpi"><div className="k">אחוז סגירה</div><div className="v num">{decided ? Math.round((won.length / decided) * 100) : 0}%</div></div>
      </div>
      <div className="nq-chips">
        {(["all", "draft", "sent", "approved", "rejected"] as const).map((s) => (
          <button key={s} className="nq-chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === "all" ? "הכול" : STATUS_LABEL[s]} · {s === "all" ? data.quotes.length : data.quotes.filter((q) => q.status === s).length}
          </button>
        ))}
        {dueCount > 0 && (
          <button className="nq-chip nq-chip-due" aria-pressed={filter === "follow"} onClick={() => setFilter("follow")}>למעקב · {dueCount}</button>
        )}
        <input className="in nq-search" placeholder="חיפוש לקוח, פרויקט או מספר" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div className="nq-qlist">
        {shown.map(({ q, c }) => (
          <div key={q.id} className="nq-qrow" role="button" tabIndex={0} onClick={() => onOpen(q.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(q.id)}>
            <span className="n num ltr" style={{ textAlign: "right" }}>{qnum(q)}</span>
            <span className="c"><b>{q.client.name || "ללא שם"}</b><span>{q.project}</span></span>
            <span className="d sub num">{fdate(q.date)}</span>
            <span className="t num">{money(c.price)}<div className="sub" style={{ fontWeight: 400 }}>לפני מע״מ</div></span>
            <span className="nq-pills">
              <span className={`nq-pill nq-st-${q.status}`}>{STATUS_LABEL[q.status]}</span>
              {fs(q).due && <span className="nq-pill nq-due">לחזור ללקוח</span>}
              {fs(q).expired && <span className="nq-pill nq-exp">פג תוקף</span>}
            </span>
            <span className="acts" onClick={(e) => e.stopPropagation()}>
              {confirmDel === q.id ? (
                <span className="nq-confirm">
                  למחוק?
                  <button className="nq-btn sm danger" onClick={() => { setConfirmDel(null); onDelete(q.id); }}>כן</button>
                  <button className="nq-btn sm" onClick={() => setConfirmDel(null)}>לא</button>
                </span>
              ) : (
                <>
                  <button className="nq-btn sm" onClick={() => onDup(q)}>שכפל</button>
                  <button className="nq-btn sm danger" onClick={() => setConfirmDel(q.id)}>מחק</button>
                </>
              )}
            </span>
          </div>
        ))}
        {!shown.length && (
          <div className="nq-empty">{data.quotes.length ? "אין הצעות שמתאימות לסינון" : "עוד אין הצעות. לחץ על \"הצעה חדשה\" כדי להתחיל"}</div>
        )}
      </div>
    </>
  );
}

/* =================== editor =================== */
function Editor({ data, q, upd, onPreview, onBack, onDup, onDelete, flash }: {
  data: AppData; q: Quote; upd: (fn: (q: Quote) => void, delay?: number) => void;
  onPreview: () => void; onBack: () => void; onDup: () => void; onDelete: () => void; flash: (m: string) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const c = calc(q, data.settings, data.pros);
  const projects = useMemo(() => Array.from(new Set(data.quotes.map((x) => x.project.trim()).filter(Boolean))).sort(), [data.quotes]);
  const heads = useMemo(
    () => Array.from(new Set(data.quotes.flatMap((x) => x.lines.filter((l) => l.type === "head").map((l) => l.desc.trim())).filter(Boolean))).sort(),
    [data.quotes]
  );
  const setLine = (id: string, patch: Partial<Line>) =>
    upd((x) => { const l = x.lines.find((y) => y.id === id); if (l) Object.assign(l, patch); });
  const addLine = (type: Exclude<LineType, "cat">) =>
    upd((x) => { x.lines.push({ id: uid(), type, qty: 1, price: 0, unit: "u", desc: "" }); });
  const move = (i: number, dir: number) =>
    upd((x) => { const j = i + dir; [x.lines[i], x.lines[j]] = [x.lines[j], x.lines[i]]; });
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <>
      <div className="nq-head">
        <div>
          <button className="nq-btn sm ghost" style={{ paddingInline: 0 }} onClick={onBack}>→ כל ההצעות</button>
          <h1 className="num ltr" style={{ textAlign: "right" }}>{qnum(q)}</h1>
        </div>
        <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          סטטוס
          <select className="in" style={{ width: "auto" }} value={q.status} onChange={(e) => upd((x) => { const v = e.target.value as Status; if (v === "sent" && x.status === "draft") markSentFields(x); else x.status = v; }, 0)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <div className="nq-ed">
        <div className="nq-stack">
          <section className="nq-card">
            <div className="nq-card-h"><h2>לקוח ופרויקט</h2><span className="hint num">תאריך {fdate(q.date)}</span></div>
            <div className="nq-fields">
              <label className="f">שם הלקוח<input className="in" value={q.client.name} onChange={(e) => upd((x) => { x.client.name = e.target.value; })} /></label>
              <label className="f">טלפון (לוואטסאפ)<input className="in num" type="tel" value={q.client.phone} onChange={(e) => upd((x) => { x.client.phone = e.target.value; })} /></label>
              <label className="f full">שם הפרויקט (הכותרת בהצעה)
                <input className="in" list="nq-projects" value={q.project} placeholder="הקלד או בחר מפרויקטים קודמים" onChange={(e) => upd((x) => { x.project = e.target.value; })} />
              </label>
            </div>
            <datalist id="nq-projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
            <datalist id="nq-heads">{Array.from(new Set(heads.concat(projects))).map((p) => <option key={p} value={p} />)}</datalist>
          </section>

          <section className="nq-card">
            <div className="nq-card-h"><h2>מה כלול בעבודה</h2><span className="hint">המחירים כאן פנימיים. הלקוח רואה תיאור, וכמות רק בפרזול</span></div>
            <div className="nq-lines">
              {q.lines.map((l, i) => {
                const catItem = l.catId ? data.cat.find((x) => x.id === l.catId) : undefined;
                return (
                  <div key={l.id} className={`nq-line ${l.type === "head" ? "head" : ""}`}>
                    <div className="meta">
                      {l.type === "cat"
                        ? <span className={`nq-tag ${l.showQty ? "qty" : "cat"}`}>{l.showQty ? "עם כמות" : "מהקטלוג"}</span>
                        : <span className={`nq-tag ${l.type}`}>{LINE_TAG[l.type]}</span>}
                      {l.path && <span className="path">{l.path}</span>}
                    </div>
                    <div className="tools">
                      <button className="nq-btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="הזז למעלה">↑</button>
                      <button className="nq-btn sm ghost" disabled={i === q.lines.length - 1} onClick={() => move(i, 1)} aria-label="הזז למטה">↓</button>
                      <button className="nq-btn sm ghost" onClick={() => upd((x) => { x.lines = x.lines.filter((y) => y.id !== l.id); })} aria-label="מחק שורה">✕</button>
                    </div>
                    {l.type === "head" ? (
                      <input className="in full" list="nq-heads" value={l.desc} placeholder="לדוגמה: מטבח, ארון לסלון" onChange={(e) => setLine(l.id, { desc: e.target.value })} />
                    ) : (
                      <textarea className="in full" rows={2} value={l.desc} placeholder="מה ייכתב בהצעה" onChange={(e) => setLine(l.id, { desc: e.target.value })} />
                    )}
                    {!!l.parts?.length && (
                      <div className="nq-parts">
                        {l.parts.map((pt, pi) => (
                          <div key={pt.id} className="nq-part">
                            <span className="nm">{pt.name}</span>
                            <input className="in num" type="number" step="0.1" inputMode="decimal" value={pt.qty} aria-label={`כמות ${pt.name}`}
                              onChange={(e) => upd((x) => { const y = x.lines.find((z) => z.id === l.id); if (y?.parts) y.parts[pi].qty = num(e.target.value); })} />
                            <span>{UNIT_LABEL[pt.unit]} ×</span>
                            <input className="in num" type="number" inputMode="decimal" value={pt.price} aria-label={`מחיר ${pt.name}`}
                              onChange={(e) => upd((x) => { const y = x.lines.find((z) => z.id === l.id); if (y?.parts) y.parts[pi].price = num(e.target.value); })} />
                            <span>₪</span>
                            <span className="st num">{money((+pt.qty || 0) * (+pt.price || 0))}</span>
                            <label className="nq-chk" style={{ padding: 0 }}>
                              <input type="checkbox" checked={pt.showQty ?? (!!l.showQty && pi === l.parts!.length - 1)}
                                onChange={(e) => upd((x) => {
                                  const y = x.lines.find((z) => z.id === l.id);
                                  if (!y?.parts) return;
                                  // first tick on an older line: fix every component's state explicitly
                                  y.parts.forEach((p, k) => { if (p.showQty === undefined) p.showQty = !!y.showQty && k === y.parts!.length - 1; });
                                  y.parts[pi].showQty = e.target.checked;
                                  y.showQty = y.parts.some((p) => p.showQty);
                                })} /> כמות ללקוח
                            </label>
                          </div>
                        ))}
                        <div className="nums">
                          <span className="lt num">{money(lineTotal(l))}</span>
                        </div>
                      </div>
                    )}
                    {l.type !== "head" && l.type !== "text" && !l.parts?.length && (
                      <>
                        <div className="nums">
                          {l.type === "lump" ? (
                            <>מחיר <input className="in num" type="number" inputMode="decimal" value={l.price} onChange={(e) => setLine(l.id, { price: num(e.target.value) })} /></>
                          ) : (
                            <>
                              <input className="in num" type="number" step="0.1" inputMode="decimal" value={l.qty} onChange={(e) => setLine(l.id, { qty: num(e.target.value) })} />
                              {UNIT_LABEL[l.unit || "u"]} ×
                              <input className="in num" type="number" inputMode="decimal" value={l.price} onChange={(e) => setLine(l.id, { price: num(e.target.value) })} /> ₪
                            </>
                          )}
                          <label className="nq-chk" style={{ padding: 0 }}><input type="checkbox" checked={!!l.showQty} onChange={(e) => setLine(l.id, { showQty: e.target.checked })} /> כמות ללקוח</label>
                          <span className="lt num">{money(lineTotal(l))}</span>
                        </div>
                        <div className="seen">
                          {l.showQty ? "בהצעה: התיאור והכמות" : "בהצעה: התיאור בלבד, בלי מחיר"}
                          {catItem && catItem.price !== l.price ? ` · מחיר הקטלוג כיום ${money(catItem.price || 0)}` : ""}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {!q.lines.length && <div className="nq-empty">עוד אין שורות. התחל מ&quot;הוסף מהקטלוג&quot;</div>}
            </div>
            <div className="nq-adds">
              <button className="nq-btn sm pri" onClick={() => setPicker(true)}>+ הוסף מהקטלוג</button>
              <button className="nq-btn sm" onClick={() => addLine("free")}>+ שורה חופשית</button>
              <button className="nq-btn sm" onClick={() => addLine("lump")}>+ מחיר כולל</button>
              <button className="nq-btn sm" onClick={() => addLine("text")}>+ שורת טקסט</button>
              <button className="nq-btn sm" onClick={() => addLine("head")}>+ כותרת אזור</button>
            </div>
          </section>

          <section className="nq-card">
            <div className="nq-card-h"><h2>עמלות</h2><span className="hint">סמויות. לא מופיעות בהצעה, מגולמות במחיר</span></div>
            {[0, 1].map((i) => {
              const list = commissionsOf(q, data.pros);
              const c = list[i] || { name: "", pct: 0 };
              const setCom = (patch: Partial<{ name: string; pct: number }>) =>
                upd((x) => {
                  const cur = commissionsOf(x, data.pros).slice(0, 2);
                  while (cur.length < 2) cur.push({ name: "", pct: 0 });
                  cur[i] = { ...cur[i], ...patch };
                  x.commissions = cur;
                  x.pros = [];
                });
              return (
                <div key={i} className="nq-pro">
                  <input className="in" value={c.name} placeholder={`עמלה ${i + 1}: למי (לא חובה)`} onChange={(e) => setCom({ name: e.target.value })} />
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input className="in num" type="number" inputMode="decimal" value={c.pct || ""} placeholder="0" onChange={(e) => setCom({ pct: num(e.target.value) })} />%
                  </label>
                  <span />
                </div>
              );
            })}
          </section>

          <section className="nq-card">
            <h2 style={{ marginBottom: 12 }}>מעקב (רק לך)</h2>
            <div className="nq-fields" style={{ marginBottom: 18 }}>
              <label className="f">תאריך מעקב — מתי לחזור ללקוח
                <input className="in" type="date" value={q.followUp || ""} onChange={(e) => upd((x) => { x.followUp = e.target.value; })} /></label>
              <label className="f">נשלחה בתאריך<input className="in" value={fdate(q.sentAt) || "עוד לא נשלחה"} readOnly /></label>
              <label className="f full">הערות פנימיות
                <textarea className="in" rows={2} value={q.internalNotes || ""} placeholder="לא מופיע בהצעה" onChange={(e) => upd((x) => { x.internalNotes = e.target.value; })} /></label>
            </div>
            <h2 style={{ marginBottom: 12 }}>אספקה והערות</h2>
            <div className="nq-fields">
              <label className="f full">זמן אספקה (נכנס כשורה בטבלה)<input className="in" value={q.delivery} placeholder="לדוגמה: אספקה 45 ימי עבודה" onChange={(e) => upd((x) => { x.delivery = e.target.value; })} /></label>
              <label className="f full">הערות ללקוח<textarea className="in" rows={2} value={q.notes} onChange={(e) => upd((x) => { x.notes = e.target.value; })} /></label>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>תנאי התשלום והתנאים הקבועים נלקחים מההגדרות</div>
          </section>

          <section className="nq-card">
            {confirmDel ? (
              <div className="nq-confirm">
                למחוק את ההצעה {qnum(q)} לתמיד?
                <button className="nq-btn sm danger" onClick={onDelete}>כן, למחוק</button>
                <button className="nq-btn sm" onClick={() => setConfirmDel(false)}>ביטול</button>
              </div>
            ) : (
              <button className="nq-btn sm ghost" onClick={() => setConfirmDel(true)}>מחיקת ההצעה</button>
            )}
          </section>
        </div>

        <aside className="nq-side nq-card">
          <h2>חישוב המחיר</h2>
          <div className="nq-private">רק אתה רואה את זה</div>
          <div className="nq-lg"><span>עלות העבודה</span><span className="num">{money(c.base)}</span></div>
          {c.coms.filter((x) => +x.pct > 0).map((x, i) => (
            <div key={i} className="nq-lg com"><span>עמלה {i + 1}{x.name ? ` (${x.name})` : ""} · {x.pct}%</span><span className="num">−{money(x.amount)}</span></div>
          ))}
          {c.pct >= 95 && <div className="hint" style={{ color: "var(--bad)" }}>סך העמלות גבוה מדי</div>}
          <label className="f" style={{ marginTop: 8 }}>תוספת פנימית % <span className="hint">(לא מופיעה ללקוח)</span>
            <input className="in num" type="number" inputMode="decimal" value={q.markup || ""} placeholder="0" onChange={(e) => upd((x) => { x.markup = num(e.target.value); })} /></label>
          {c.markup > 0 && <div className="nq-lg"><span>תוספת פנימית</span><span className="num">+{money(c.markup)}</span></div>}
          {(() => {
            const pctMode = !!q.discount && !q.discountAmt ? true : !q.discountAmt && q.discountMode === "pct";
            const val = pctMode ? q.discount : q.discountAmt;
            const setMode = (m: "pct" | "amt") => upd((x) => {
              const v = x.discount || x.discountAmt || 0;
              x.discountMode = m;
              x.discount = m === "pct" ? v : 0;
              x.discountAmt = m === "amt" ? v : 0;
            });
            return (
              <label className="f" style={{ margin: "8px 0 6px" }}>הנחה ללקוח <span className="hint">(מופיעה ב-PDF)</span>
                <span className="nq-disc">
                  <input className="in num" type="number" inputMode="decimal" value={val || ""} placeholder="0"
                    onChange={(e) => upd((x) => { if (pctMode) { x.discount = num(e.target.value); x.discountAmt = 0; } else { x.discountAmt = num(e.target.value); x.discount = 0; } })} />
                  <span className="nq-seg" role="group" aria-label="סוג ההנחה">
                    <button type="button" aria-pressed={!pctMode} onClick={() => setMode("amt")}>₪</button>
                    <button type="button" aria-pressed={pctMode} onClick={() => setMode("pct")}>%</button>
                  </span>
                </span>
              </label>
            );
          })()}
          {c.discount >= 1 && <div className="nq-lg"><span>מחיר לפני הנחות</span><span className="num">{money(c.list)}</span></div>}
          {c.pctOff >= 1 && <div className="nq-lg"><span>הנחה {c.discountPct}%</span><span className="num">−{money(c.pctOff)}</span></div>}
          {c.discountAmt > 0 && <div className="nq-lg"><span>הנחה בשקלים</span><span className="num">−{money(c.discountAmt)}</span></div>}
          <div className="nq-lg sep"><span>ללקוח, לפני מע״מ</span><span className="num">{money(c.price)}</span></div>
          <div className="nq-lg"><span>מע״מ {data.settings.vat}%</span><span className="num">{money(c.vat)}</span></div>
          <div className="nq-lg big"><span>סה״כ כולל מע״מ</span><span className="num">{money(c.total)}</span></div>
          {c.coms.length > 0 && <div className="nq-lg net"><span>נשאר לך אחרי עמלות</span><b className="num">{money(c.net)}</b></div>}
          <div className="nq-side-acts">
            <button className="nq-btn" onClick={() => document.getElementById("nq-live")?.scrollIntoView({ behavior: "smooth" })}>↓ לתצוגה המקדימה</button>
            <button className="nq-btn pri" onClick={onPreview}>תצוגה, PDF ושליחה</button>
            <button className="nq-btn" onClick={onDup}>שכפל להצעה חדשה</button>
            <a className="nq-btn" href={claudeLink(`בהצעה ${qnum(q)} במערכת נויה: `)} target="_blank" rel="noopener">✨ שינוי בקלוד</a>
          </div>
        </aside>
      </div>

      <section className="nq-card nq-live" id="nq-live">
        <div className="nq-card-h"><h2>תצוגה מקדימה</h2><span className="hint">כך ההצעה תיראה ללקוח. מתעדכנת תוך כדי עריכה</span></div>
        <DocFrame><QuoteDoc quote={q} settings={data.settings} pros={data.pros} /></DocFrame>
      </section>

      <div className="nq-bar">
        <div><div className="tt">ללקוח, לפני מע״מ</div><div className="tv num">{money(c.price)}</div></div>
        <a className="nq-btn" href={claudeLink(`בהצעה ${qnum(q)} במערכת נויה: `)} target="_blank" rel="noopener">✨ שינוי בקלוד</a>
        <button className="nq-btn pri" onClick={onPreview}>תצוגה ושליחה</button>
      </div>

      {picker && (
        <Picker cat={data.cat} onClose={() => setPicker(false)}
          onPick={(n) => { upd((x) => { x.lines.push(lineFrom(data.cat, n)); }); flash("נוסף להצעה"); setPicker(false); }} />
      )}
    </>
  );
}

/* =================== catalog picker (as in V6: one dropdown per level) =================== */
function Picker({ cat, onPick, onClose }: { cat: CatNode[]; onPick: (n: CatNode) => void; onClose: () => void }) {
  const [path, setPath] = useState<string[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  // Level 1 lists the top items; each chosen item that has sub-items opens the next level.
  const parents = [""];
  for (const id of path) if (kids(cat, id).length) parents.push(id);
  const chosen = path.length ? cat.find((c) => c.id === path[path.length - 1]) : undefined;
  const p = chosen ? pathPrice(cat, chosen) : null;

  return (
    <div className="nq-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nq-sheet nq-modal" role="dialog" aria-label="בחר פריט מהמחירון">
        <button className="nq-btn sm nq-x" onClick={onClose} aria-label="סגור">×</button>
        <h2>בחר פריט מהמחירון</h2>
        <div className="sub">בחר שלב אחר שלב. אפשר לעצור בכל רמה וללחוץ &quot;הוסף את הפריט הנבחר&quot;.</div>
        {parents.map((pid, i) => (
          <label key={pid || "root"} className="nq-lvl">
            רמה {i + 1}
            <select className="in" value={path[i] || ""} onChange={(e) => setPath([...path.slice(0, i), e.target.value].filter(Boolean))}>
              <option value="">בחר...</option>
              {kids(cat, pid).map((c) => (
                <option key={c.id} value={c.id}>{label(c)}{c.folder ? " ›" : ""}</option>
              ))}
            </select>
          </label>
        ))}
        {chosen && (
          <div className="nq-chosen">
            <div>{composeDesc(cat, chosen) || label(chosen)}</div>
            <div className="hint num">{p && p.price ? `${money(p.price)} ${p.unit === "m" ? "למטר" : "ליחידה"}` : "ללא מחיר"}</div>
          </div>
        )}
        <button className="nq-btn pri" disabled={!chosen} onClick={() => chosen && onPick(chosen)}>הוסף את הפריט הנבחר</button>
      </div>
    </div>
  );
}

/* =================== preview / send =================== */
function Preview({ data, q, onBack, flash, markSent, saveNow }: { data: AppData; q: Quote; onBack: () => void; flash: (m: string) => void; markSent: () => void; saveNow: () => Promise<void> }) {
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const c = calc(q, data.settings, data.pros);
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator && /Android|iPhone|iPad/i.test(navigator.userAgent);

  // The real (text) PDF comes from the server; the in-browser version is only a fallback.
  const makePdf = async () => {
    await saveNow();
    const res = await fetch(`/api/q/${q.id}/pdf`).catch(() => null);
    if (res?.ok) return res.blob();
    const el = box.current?.querySelector(".nq-doc") as HTMLElement | null;
    if (!el) throw new Error("no doc");
    return quotePdf(el);
  };
  const onDownload = async () => {
    setBusy(true);
    try { downloadBlob(await makePdf(), pdfName(qnum(q), q.client.name)); }
    catch { flash("יצירת ה-PDF נכשלה. נסה שוב"); }
    setBusy(false);
  };
  const onShare = async () => {
    setBusy(true);
    try {
      const ok = await sharePdf(await makePdf(), pdfName(qnum(q), q.client.name), `הצעת מחיר ${qnum(q)} מנויה מטבחים`);
      if (!ok) flash("השיתוף לא נתמך במכשיר הזה. השתמש בהורדה");
      else markSent();
    } catch { flash("יצירת ה-PDF נכשלה. נסה שוב"); }
    setBusy(false);
  };
  const onWhatsApp = () => {
    if (!q.client.phone) return flash("חסר טלפון של הלקוח");
    window.open(waLink(q, data.settings, c.total, window.location.origin), "_blank", "noopener");
    markSent();
  };

  return (
    <>
      <div className="nq-cv-bar">
        <button className="nq-btn sm" onClick={onBack}>→ חזרה לעריכה</button>
        <span className="grow" />
        <button className="nq-btn sm" disabled={busy} onClick={onDownload}>{busy ? "מכין PDF…" : "הורדת PDF"}</button>
        {canShare && <button className="nq-btn sm" disabled={busy} onClick={onShare}>שיתוף PDF</button>}
        <a className="nq-btn sm" href={`/q/${q.id}`} target="_blank" rel="noopener">עמוד הלקוח</a>
        <button className="nq-btn sm wa" onClick={onWhatsApp}>שליחה בוואטסאפ</button>
      </div>
      <div className="nq-note">
        &quot;שליחה בוואטסאפ&quot; פותח הודעה ללקוח עם קישור אישי להצעה. בקישור הלקוח רואה את ההצעה, מוריד PDF ומאשר. &quot;שיתוף PDF&quot; בטלפון שולח את הקובץ עצמו.
      </div>
      <div ref={box}>
        <DocFrame><QuoteDoc quote={q} settings={data.settings} pros={data.pros} /></DocFrame>
      </div>
    </>
  );
}

/* =================== catalog editor (as in V6) =================== */
type ItemForm = { mode: "new" | "edit"; parentId: string; id?: string; name: string; desc: string; unit: "m" | "u"; price: string };

function CatalogView({ cat, upd }: { cat: CatNode[]; upd: (fn: (cat: CatNode[]) => CatNode[]) => void }) {
  const [at, setAt] = useState("");
  const [form, setForm] = useState<ItemForm | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const cur = cat.find((c) => c.id === at);
  const trail = cur ? [...ancestors(cat, cur), cur] : [];
  const inherited = cur ? ancestors(cat, cur).some((a) => a.showQty) : false;
  const list = kids(cat, at);

  const openNew = (parentId: string) => setForm({ mode: "new", parentId, name: "", desc: "", unit: "u", price: "" });
  const openEdit = (c: CatNode) =>
    setForm({ mode: "edit", parentId: c.parentId, id: c.id, name: c.name, desc: c.desc || "", unit: c.unit || "u", price: c.price ? String(c.price) : "" });
  const save = () => {
    if (!form) return;
    const fields = { name: form.name.trim(), desc: form.desc.trim(), unit: form.unit, price: form.price === "" ? 0 : Number(form.price) };
    if (form.mode === "edit") upd((all) => all.map((c) => (c.id === form.id ? { ...c, ...fields } : c)));
    else {
      upd((all) => [...all, { id: uid(), parentId: form.parentId, folder: false, ...fields }]);
      setAt(form.parentId); // show the level the new item went into
    }
    setForm(null);
  };
  const del = (id: string) => {
    const ids = new Set([id, ...descendantIds(cat, id)]);
    upd((all) => all.filter((c) => !ids.has(c.id)));
    setConfirm(null);
  };
  const parentName = (pid: string) => {
    const p = cat.find((c) => c.id === pid);
    return p ? label(p) : "ראשי";
  };

  return (
    <>
      <div className="nq-head"><h1>מחירון עץ</h1></div>
      <div className="nq-stack">
        <section className="nq-card">
          <div className="nq-adds" style={{ marginTop: 0 }}>
            <button className="nq-btn pri" onClick={() => openNew("")}>+ פריט ראשי</button>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>כל פריט יכול לקבל תתי־פריטים ללא הגבלה. מחיר ותיאור ממלאים בפריט הסופי.</div>
        </section>

        <section className="nq-card">
          <h2 style={{ marginBottom: 10 }}>{cur ? label(cur) : "ראשי המחירון"}</h2>
          <div className="nq-trail">
            <button className="nq-btn sm" onClick={() => setAt("")}>ראשי</button>
            {trail.map((n) => (
              <span key={n.id} style={{ display: "contents" }}>
                <span className="hint">‹</span>
                <button className="nq-btn sm" onClick={() => setAt(n.id)}>{label(n)}</button>
              </span>
            ))}
          </div>
          <div className="nq-adds">
            <button className="nq-btn sm" onClick={() => openNew(at)}>+ תת פריט כאן</button>
          </div>
          {cur && (
            <label className="nq-chk">
              <input type="checkbox" checked={!!cur.showQty || inherited} disabled={inherited} onChange={(e) => upd((all) => all.map((c) => (c.id === cur.id ? { ...c, showQty: e.target.checked } : c)))} />
              להציג ללקוח כמות לכל מה שמתחת ל&quot;{label(cur)}&quot;{inherited ? " (נקבע ברמה מעל)" : ""}
            </label>
          )}
        </section>

        <div className="nq-items">
          {list.map((c) => {
            const p = priceOf(cat, c);
            const n = leafCount(cat, c.id);
            return (
              <div key={c.id} className="nq-item">
                <button className="nq-item-name" onClick={() => setAt(c.id)}>
                  <b>{label(c)}</b>{c.folder ? <span className="hint"> · {n} תתי פריטים ‹</span> : null}
                </button>
                {c.desc && <div className="nq-item-desc">{c.desc}</div>}
                {!!c.price && <div className="hint num">{money(c.price)} {p.unit === "m" ? "למטר" : "ליחידה"}</div>}
                <div className="nq-item-acts">
                  <button className="nq-btn sm" onClick={() => openNew(c.id)}>+ תת</button>
                  <button className="nq-btn sm" onClick={() => openEdit(c)}>ערוך</button>
                  <button className="nq-btn sm danger" onClick={() => (c.folder ? setConfirm(c.id) : del(c.id))}>מחק</button>
                </div>
                {confirm === c.id && (
                  <div className="nq-confirm">
                    למחוק את &quot;{label(c)}&quot; עם כל {n} הפריטים שמתחתיו?
                    <button className="nq-btn sm danger" onClick={() => del(c.id)}>כן, למחוק</button>
                    <button className="nq-btn sm" onClick={() => setConfirm(null)}>ביטול</button>
                  </div>
                )}
              </div>
            );
          })}
          {!list.length && <div className="nq-card hint">אין תתי פריטים כאן. אפשר להוסיף תת פריט.</div>}
        </div>
      </div>

      {form && (
        <div className="nq-scrim" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="nq-sheet nq-modal" role="dialog" aria-label="פריט" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <button type="button" className="nq-btn sm nq-x" onClick={() => setForm(null)} aria-label="סגור">×</button>
            <h2>{form.mode === "new" ? "פריט חדש" : "עריכת פריט"}</h2>
            <div className="sub">משויך תחת: <b>{parentName(form.parentId)}</b></div>
            <label className="nq-lvl">שם
              <input className="in" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="nq-lvl">תיאור ללקוח
              <textarea className="in" rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
            <label className="nq-lvl">יחידה
              <select className="in" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as "m" | "u" })}>
                <option value="u">יחידה</option><option value="m">מטר</option>
              </select></label>
            <label className="nq-lvl">מחיר
              <input className="in num" type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            <div className="hint">אפשר להשאיר מחיר/תיאור ריק בפריט אב, ולמלא רק בפריט הסופי.</div>
            <div><button className="nq-btn pri" disabled={!form.name.trim()}>שמור</button></div>
          </form>
        </div>
      )}
    </>
  );
}

/* =================== settings =================== */
function SettingsView({ data, upd }: { data: AppData; upd: (fn: (s: Settings, pros: Pro[]) => { settings?: Settings; pros?: Pro[] } | void) => void }) {
  const st = data.settings;
  const field = (k: keyof Settings, label: string, opts: { type?: string; full?: boolean } = {}) => (
    <label className={`f ${opts.full ? "full" : ""}`}>
      {label}
      <input className={`in ${opts.type === "number" ? "num" : ""}`} type={opts.type || "text"} value={String(st[k] ?? "")}
        onChange={(e) => upd((s) => { (s as Record<string, unknown>)[k] = opts.type === "number" ? Number(e.target.value) : e.target.value; })} />
    </label>
  );
  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  };
  return (
    <>
      <div className="nq-head"><div><h1>הגדרות</h1><div className="sub">פרטים שמופיעים בכל הצעה</div></div></div>
      <div className="nq-grid2">
        <section className="nq-card">
          <h2 style={{ marginBottom: 12 }}>פרטי העסק</h2>
          <div className="nq-fields">
            {field("biz", "שם העסק בהצעה", { full: true })}{field("owner", "שם")}{field("phone", "טלפון")}
            {field("vatId", "עוסק מורשה")}{field("address", "כתובת")}{field("web", "אתר")}{field("email", "אימייל")}
          </div>
        </section>
        <section className="nq-card">
          <h2 style={{ marginBottom: 12 }}>תנאים וחישוב</h2>
          <div className="nq-fields">
            {field("payment", "תנאי תשלום", { full: true })}
            <label className="f full">תנאים קבועים (שורה לכל סעיף)
              <textarea className="in" rows={5} value={st.clauses} onChange={(e) => upd((s) => { s.clauses = e.target.value; })} />
            </label>
            {field("defaultCommissionPct", "עמלה קבועה % (בכל הצעה חדשה)", { type: "number" })}{field("validity", "תוקף הצעה (ימים)", { type: "number" })}{field("vat", "מע״מ %", { type: "number" })}
          </div>
        </section>
        <section className="nq-card" style={{ gridColumn: "1 / -1" }}>
          <div className="nq-card-h"><h2>אנשי מקצוע</h2><span className="hint">האחוז הוא ברירת המחדל, ואפשר לשנות בכל הצעה</span></div>
          <div className="nq-scroll">
            <table className="nq-tbl">
              <thead><tr><th>שם</th><th>תפקיד</th><th>עמלה %</th><th /></tr></thead>
              <tbody>
                {data.pros.map((p, i) => (
                  <tr key={p.id}>
                    <td><input className="in" value={p.name} onChange={(e) => upd((_s, pros) => { pros[i].name = e.target.value; })} /></td>
                    <td><input className="in" value={p.role} placeholder="אדריכלית, קבלן…" onChange={(e) => upd((_s, pros) => { pros[i].role = e.target.value; })} /></td>
                    <td style={{ width: 100 }}><input className="in num" type="number" value={p.pct} onChange={(e) => upd((_s, pros) => { pros[i].pct = Number(e.target.value); })} /></td>
                    <td style={{ width: 44 }}><button className="nq-btn sm ghost" onClick={() => upd((_s, pros) => ({ pros: pros.filter((x) => x.id !== p.id) }))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.pros.length && <div className="hint" style={{ marginTop: 8 }}>עוד אין אנשי מקצוע</div>}
          <div className="nq-adds"><button className="nq-btn sm" onClick={() => upd((_s, pros) => ({ pros: [...pros, { id: uid(), name: "", role: "", pct: 10 }] }))}>+ איש מקצוע</button></div>
        </section>
        <SecurityCard />
        <section className="nq-card" style={{ gridColumn: "1 / -1" }}>
          <div className="nq-card-h"><h2>יציאה</h2><button className="nq-btn sm" onClick={logout}>התנתקות</button></div>
        </section>
      </div>
    </>
  );
}

/* =================== password + reset mail =================== */
function SecurityCard() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [mail, setMail] = useState<{ hasKey: boolean; hasAgentKey?: boolean; email: string } | null>(null);
  const [key, setKey] = useState("");
  const [keyMsg, setKeyMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/mail").then((r) => r.json()).then(setMail).catch(() => {});
  }, []);

  const changePw = async () => {
    if (next.length < 8) return setPwMsg("הסיסמה החדשה צריכה להיות לפחות 8 תווים");
    setPwMsg("שומר…");
    const res = await fetch("/api/admin/password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: cur, next }),
    }).catch(() => null);
    if (res?.ok) { setPwMsg("הסיסמה הוחלפה ✓"); setCur(""); setNext(""); }
    else setPwMsg(res?.status === 401 ? "הסיסמה הנוכחית לא נכונה" : "השמירה נכשלה. נסה שוב");
  };
  const [agentKey, setAgentKey] = useState("");
  const [agentMsg, setAgentMsg] = useState("");
  const saveAgentKey = async () => {
    setAgentMsg("שומר…");
    const res = await fetch("/api/admin/mail", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anthropicKey: agentKey }),
    }).catch(() => null);
    if (res?.ok) { setAgentMsg("המפתח נשמר ✓"); setAgentKey(""); setMail((m) => (m ? { ...m, hasAgentKey: true } : m)); }
    else setAgentMsg(res?.status === 400 ? "המפתח לא נראה תקין. הוא מתחיל ב-sk-ant-" : "השמירה נכשלה. נסה שוב");
  };
  const saveKey = async () => {
    setKeyMsg("שומר…");
    const res = await fetch("/api/admin/mail", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resendKey: key }),
    }).catch(() => null);
    if (res?.ok) { setKeyMsg("המפתח נשמר ✓"); setKey(""); setMail((m) => (m ? { ...m, hasKey: true } : m)); }
    else setKeyMsg(res?.status === 400 ? "המפתח לא נראה תקין. הוא מתחיל ב-re_" : "השמירה נכשלה. נסה שוב");
  };

  return (
    <section className="nq-card" style={{ gridColumn: "1 / -1" }}>
      <h2 style={{ marginBottom: 12 }}>סיסמה ואיפוס במייל</h2>
      <div className="nq-grid2">
        <div className="nq-stack">
          <b>החלפת סיסמה</b>
          <input className="in" type="password" autoComplete="current-password" placeholder="סיסמה נוכחית" value={cur} onChange={(e) => setCur(e.target.value)} />
          <input className="in" type="password" autoComplete="new-password" placeholder="סיסמה חדשה (לפחות 8 תווים)" value={next} onChange={(e) => setNext(e.target.value)} />
          <div><button className="nq-btn sm pri" disabled={!cur || !next} onClick={changePw}>החלף סיסמה</button></div>
          {pwMsg && <div className="hint">{pwMsg}</div>}
        </div>
        <div className="nq-stack">
          <b>מייל לאיפוס סיסמה</b>
          <div className="hint">
            קישור האיפוס נשלח אל <span className="ltr">{mail?.email || "…"}</span> (משנים בשדה האימייל למעלה).{" "}
            {mail?.hasKey ? "שליחת מיילים מוגדרת ✓" : "כדי שהשליחה תעבוד צריך מפתח Resend אחד."}
          </div>
          <input className="in ltr" style={{ textAlign: "left" }} placeholder={mail?.hasKey ? "מפתח שמור. להחלפה הדבק מפתח חדש" : "re_..."} value={key} onChange={(e) => setKey(e.target.value)} />
          <div><button className="nq-btn sm" disabled={!key.trim()} onClick={saveKey}>שמור מפתח</button></div>
          {keyMsg && <div className="hint">{keyMsg}</div>}
        </div>
        <div className="nq-stack">
          <b>הסוכן (הצעה מהודעה)</b>
          <div className="hint">
            {mail?.hasAgentKey ? "הסוכן מחובר ✓" : "כדי שהסוכן יעבוד צריך מפתח Anthropic אחד (מתחיל ב-sk-ant-)."}
          </div>
          <input className="in ltr" style={{ textAlign: "left" }} placeholder={mail?.hasAgentKey ? "מפתח שמור. להחלפה הדבק מפתח חדש" : "sk-ant-..."} value={agentKey} onChange={(e) => setAgentKey(e.target.value)} />
          <div><button className="nq-btn sm" disabled={!agentKey.trim()} onClick={saveAgentKey}>שמור מפתח</button></div>
          {agentMsg && <div className="hint">{agentMsg}</div>}
        </div>
      </div>
    </section>
  );
}

/* =================== agent: quote from a dictated message =================== */
type AgentDraft = Pick<Quote, "client" | "project" | "delivery" | "notes" | "lines"> & { notFound: string[] };

type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null };

function AgentModal({ onClose, onDraft }: { onClose: () => void; onDraft: (d: AgentDraft) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rec, setRec] = useState<SpeechRec | null>(null);
  const SR = typeof window !== "undefined"
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => SpeechRec) | undefined
    : undefined;

  const toggleMic = () => {
    if (rec) { rec.stop(); return; }
    if (!SR) return;
    const r = new SR();
    r.lang = "he-IL";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let add = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript + " ";
      if (add) setText((t) => (t ? t.trimEnd() + " " : "") + add.trim());
    };
    r.onend = () => setRec(null);
    r.onerror = () => { setRec(null); setErr("ההקלטה נעצרה. אפשר גם להכתיב עם המיקרופון של המקלדת"); };
    r.start();
    setRec(r);
  };

  const build = async () => {
    rec?.stop();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/agent", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      const d: AgentDraft = await res.json();
      if (d.notFound.length) d.notes = [d.notes, `לא נמצא בקטלוג (להשלים): ${d.notFound.join(", ")}`].filter(Boolean).join("\n");
      return onDraft(d);
    }
    const code = await res?.json().then((j) => j.error).catch(() => "");
    setErr(
      code === "no-key" ? "הסוכן עוד לא מחובר. צריך להוסיף מפתח Anthropic בהגדרות"
      : code === "bad-key" ? "מפתח Anthropic לא תקין. בדוק אותו בהגדרות"
      : code === "busy" ? "יש עומס כרגע. נסה שוב בעוד דקה"
      : "לא הצלחתי לבנות טיוטה. נסה לנסח שוב"
    );
  };

  return (
    <div className="nq-scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="nq-sheet nq-modal" role="dialog" aria-label="הצעה מהודעה">
        <button className="nq-btn sm nq-x" onClick={onClose} disabled={busy} aria-label="סגור">×</button>
        <h2>הצעה מהודעה</h2>
        <div className="sub">תאר את העבודה במילים שלך, בהקלטה או בכתיבה. הסוכן יבנה טיוטה מהקטלוג, ואתה תבדוק לפני שליחה.</div>
        <textarea className="in" rows={7} value={text} onChange={(e) => setText(e.target.value)} disabled={busy}
          placeholder={"לדוגמה: משפחת כהן 052-1234567. מטבח: 4 מטר תחתון סנדוויץ׳ שמפנייה, 3 מטר עליון, חזיתות פורמייקה, 8 מגירות מריוובוקס, 2 קלפות. ארון קיר 2 מטר עם דלתות הזזה. אספקה 45 ימי עבודה"} />
        <div className="nq-adds" style={{ marginTop: 0 }}>
          {SR && (
            <button className={`nq-btn ${rec ? "danger" : ""}`} onClick={toggleMic} disabled={busy}>
              {rec ? "⏹ עצור הקלטה" : "🎤 הקלטה"}
            </button>
          )}
          <button className="nq-btn pri" onClick={build} disabled={busy || text.trim().length < 5}>
            {busy ? "בונה טיוטה… (עד חצי דקה)" : "בנה טיוטה"}
          </button>
        </div>
        {!SR && <div className="hint">אפשר להכתיב עם המיקרופון שבמקלדת של הטלפון.</div>}
        {err && <div className="nq-err">{err}</div>}
      </div>
    </div>
  );
}
