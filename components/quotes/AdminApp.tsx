"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STATUS_LABEL, UNIT_LABEL, ancestors, calc, descendantIds, fdate, kids, leafCount, lineFrom, lineTotal,
  autoDesc, commissionsOf, composeDesc, label, money, pathPrice, priceOf, normalizeCat, optPrice, pathOf, tidyCat, qnum, todayIL, uid, waLink,
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
        setData({ ...d, cat: normalizeCat(tidyCat(d.cat)) });
        let last: string | null = null;
        try { last = localStorage.getItem("nq-open"); } catch {}
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
    return () => {
      removeEventListener("popstate", onPop);
      removeEventListener("beforeunload", onLeave);
    };
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
      return q ? api(`/api/admin/quotes/${id}`, "PUT", q) : Promise.resolve();
    }, delay);

  const updQuote = (id: string, fn: (q: Quote) => void, delay?: number) => {
    setData((d) => {
      if (!d) return d;
      const quotes = d.quotes.map((q) => {
        if (q.id !== id) return q;
        const c = structuredClone(q);
        fn(c);
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

  const newQuote = (from?: Quote) => {
    if (!data) return;
    const date = todayIL();
    const seq = (dataRef.current || data).quotes.filter((q) => q.date === date).reduce((m, q) => Math.max(m, q.seq), 0) + 1;
    const base: Omit<Quote, "id" | "date" | "seq" | "status"> = from
      ? structuredClone({ ...from, approvedBy: undefined, approvedAt: undefined })
      : { client: { name: "", phone: "" }, project: "", lines: [], pros: [], round: true, delivery: "אספקה 45 ימי עבודה", notes: "" };
    const q: Quote = { ...base, id: uid(12), date, seq, status: "draft" };
    q.lines = q.lines.map((l) => ({ ...l, id: uid() }));
    setData((d) => {
      const next = d ? { ...d, quotes: [...d.quotes, q] } : d;
      dataRef.current = next;
      return next;
    });
    saveQuoteLater(q.id, 0);
    go("edit", q.id);
    flash(from ? `שוכפלה להצעה ${qnum(q)}` : `נפתחה הצעה ${qnum(q)}`);
  };

  const removeQuote = async (id: string) => {
    clearTimeout(timers.current["q:" + id]);
    try {
      await api(`/api/admin/quotes/${id}`, "DELETE");
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
    <div className="nq">
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
        {view === "list" && <ListView data={data} onOpen={(id) => go("edit", id)} onNew={() => newQuote()} onDup={newQuote} onDelete={removeQuote} />}
        {view === "edit" && q && (
          <Editor
            data={data} q={q} upd={(fn, delay) => updQuote(q.id, fn, delay)}
            onPreview={() => go("preview", q.id)} onBack={() => go("list")}
            onDup={() => newQuote(q)} onDelete={() => removeQuote(q.id)} flash={flash}
          />
        )}
        {view === "preview" && q && (
          <Preview data={data} q={q} onBack={() => go("edit", q.id)} flash={flash}
            markSent={() => q.status === "draft" && updQuote(q.id, (x) => { x.status = "sent"; }, 0)} />
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

/* =================== list =================== */
function ListView({ data, onOpen, onNew, onDup, onDelete }: { data: AppData; onOpen: (id: string) => void; onNew: () => void; onDup: (q: Quote) => void; onDelete: (id: string) => void }) {
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [term, setTerm] = useState("");
  const rows = useMemo(() => data.quotes.map((q) => ({ q, c: calc(q, data.settings, data.pros) })), [data]);
  const open = rows.filter((x) => x.q.status === "sent");
  const won = rows.filter((x) => x.q.status === "approved");
  const decided = rows.filter((x) => x.q.status === "approved" || x.q.status === "rejected").length;
  const t = term.trim();
  const shown = rows
    .filter((x) => filter === "all" || x.q.status === filter)
    .filter((x) => !t || `${x.q.client.name} ${x.q.project} ${qnum(x.q)} ${x.q.client.phone}`.includes(t))
    .sort((a, b) => qnum(b.q).localeCompare(qnum(a.q)));

  return (
    <>
      <div className="nq-head">
        <div><h1>הצעות מחיר</h1><div className="sub">החדשות למעלה</div></div>
        <button className="nq-btn pri" onClick={onNew}>+ הצעה חדשה</button>
      </div>
      <div className="nq-kpis">
        <div className="nq-kpi"><div className="k">ממתינות לתשובה</div><div className="v num">{open.length}</div></div>
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
        <input className="in nq-search" placeholder="חיפוש לקוח, פרויקט או מספר" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div className="nq-qlist">
        {shown.map(({ q, c }) => (
          <div key={q.id} className="nq-qrow" role="button" tabIndex={0} onClick={() => onOpen(q.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(q.id)}>
            <span className="n num ltr" style={{ textAlign: "right" }}>{qnum(q)}</span>
            <span className="c"><b>{q.client.name || "ללא שם"}</b><span>{q.project}</span></span>
            <span className="d sub num">{fdate(q.date)}</span>
            <span className="t num">{money(c.price)}<div className="sub" style={{ fontWeight: 400 }}>לפני מע״מ</div></span>
            <span><span className={`nq-pill nq-st-${q.status}`}>{STATUS_LABEL[q.status]}</span></span>
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
          <select className="in" style={{ width: "auto" }} value={q.status} onChange={(e) => upd((x) => { x.status = e.target.value as Status; }, 0)}>
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
                          </div>
                        ))}
                        <div className="nums">
                          <label className="nq-chk" style={{ padding: 0 }}><input type="checkbox" checked={!!l.showQty} onChange={(e) => setLine(l.id, { showQty: e.target.checked })} /> כמות ללקוח</label>
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
          <div className="nq-adj">
            <label className="f">תוספת פנימית % <span className="hint">(לא מופיעה ללקוח)</span>
              <input className="in num" type="number" inputMode="decimal" value={q.markup ?? 0} onChange={(e) => upd((x) => { x.markup = num(e.target.value); })} /></label>
            <label className="f">הנחה ללקוח % <span className="hint">(מופיעה ב-PDF)</span>
              <input className="in num" type="number" inputMode="decimal" value={q.discount ?? 0} onChange={(e) => upd((x) => { x.discount = num(e.target.value); })} /></label>
          </div>
          {c.markup > 0 && <div className="nq-lg"><span>תוספת פנימית</span><span className="num">+{money(c.markup)}</span></div>}
          {c.discountPct > 0 && <div className="nq-lg"><span>הנחה {c.discountPct}% (מחיר לפני הנחה {money(c.list)})</span><span className="num">−{money(c.discount)}</span></div>}
          <div className="nq-lg sep"><span>ללקוח, לפני מע״מ</span><span className="num">{money(c.price)}</span></div>
          <div className="nq-lg"><span>מע״מ {data.settings.vat}%</span><span className="num">{money(c.vat)}</span></div>
          <div className="nq-lg big"><span>סה״כ כולל מע״מ</span><span className="num">{money(c.total)}</span></div>
          {c.coms.length > 0 && <div className="nq-lg net"><span>נשאר לך אחרי עמלות</span><b className="num">{money(c.net)}</b></div>}
          <div className="nq-side-acts">
            <button className="nq-btn pri" onClick={onPreview}>תצוגה, PDF ושליחה</button>
            <button className="nq-btn" onClick={onDup}>שכפל להצעה חדשה</button>
          </div>
        </aside>
      </div>

      <div className="nq-bar">
        <div><div className="tt">ללקוח, לפני מע״מ</div><div className="tv num">{money(c.price)}</div></div>
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
function Preview({ data, q, onBack, flash, markSent }: { data: AppData; q: Quote; onBack: () => void; flash: (m: string) => void; markSent: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const c = calc(q, data.settings, data.pros);
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator && /Android|iPhone|iPad/i.test(navigator.userAgent);

  const makePdf = async () => {
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
            {field("validity", "תוקף הצעה (ימים)", { type: "number" })}{field("vat", "מע״מ %", { type: "number" })}
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
        <section className="nq-card" style={{ gridColumn: "1 / -1" }}>
          <div className="nq-card-h"><h2>יציאה</h2><button className="nq-btn sm" onClick={logout}>התנתקות</button></div>
        </section>
      </div>
    </>
  );
}
