"use client";
// The Bluran color fan: every front shade Bluran sells, by collection, with its swatch, name and code.
// Used for the whole kitchen (fronts / uppers) and for one cabinet or one door of it.
import { useMemo, useState } from "react";
import { BLURAN, BLURAN_GROUPS, bluranImg, bluranOf } from "@/lib/quotes/bluran";
import { FRONT_COLORS, colorName, colorOf } from "@/lib/quotes/layout";

/** The swatch of a color value ("bl:CODE", an old color name or #hex) as a CSS background */
export function swatchStyle(v?: string): React.CSSProperties {
  const bl = bluranOf(v);
  if (bl) return { backgroundImage: `url(${bluranImg(bl)})`, backgroundSize: "cover", backgroundColor: bl.hex };
  return { background: colorOf(v, FRONT_COLORS, "#f2f1ec") };
}

/** The fan itself, in a sheet. `scopes`: what the choice applies to (the whole cabinet, door 1, door 2…). */
export function BluranSheet({ title, value, scopes, onPick, onClose, emptyLabel }: {
  title: string;
  value: (scope: number) => string | undefined;
  scopes?: string[];
  onPick: (v: string | undefined, scope: number) => void;
  onClose: () => void;
  emptyLabel: string;
}) {
  const [scope, setScope] = useState(0);
  const cur = value(scope);
  const [group, setGroup] = useState(bluranOf(cur)?.group || BLURAN_GROUPS[0]);
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim();
    return BLURAN.filter((s) => (t ? `${s.name} ${s.code} ${s.group}`.includes(t) : s.group === group));
  }, [q, group]);
  return (
    <div className="nq-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nq-sheet nq-modal nqb-sheet" role="dialog" aria-label={title}>
        <div className="nqb-head">
          <h2>{title}</h2>
          <button type="button" className="nq-btn sm" onClick={onClose}>סגור</button>
        </div>
        {scopes && scopes.length > 1 && (
          <div className="nq-chips">
            {scopes.map((s, i) => (
              <button key={i} type="button" className="nq-chip nqb-scope" aria-pressed={scope === i} onClick={() => setScope(i)}>
                <span className="nqb-dot" style={swatchStyle(value(i) || (i ? value(0) : undefined))} />{s}
              </button>
            ))}
          </div>
        )}
        <div className="nqb-now">
          <span className="nqb-dot lg" style={swatchStyle(cur)} />
          <span>{cur ? colorName(cur) : emptyLabel}</span>
          {cur && <button type="button" className="nq-btn sm ghost" onClick={() => onPick(undefined, scope)}>{scope ? "כמו הארון" : emptyLabel}</button>}
        </div>
        <input className="in" placeholder="חיפוש לפי שם או קוד, למשל שנהב או ZA02" value={q} onChange={(e) => setQ(e.target.value)} />
        {!q.trim() && (
          <div className="nq-chips nqb-groups">
            {BLURAN_GROUPS.map((g) => <button key={g} type="button" className="nq-chip" aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}
          </div>
        )}
        <div className="nqb-grid">
          {shown.map((s) => {
            const v = `bl:${s.code}`;
            return (
              <button key={s.code} type="button" className={`nqb-sw ${cur === v ? "on" : ""}`} onClick={() => onPick(v, scope)} title={`${s.group} · ${s.name} ${s.code}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bluranImg(s)} alt="" loading="lazy" />
                <span>{s.name}</span>
                <small className="ltr">{s.code}</small>
              </button>
            );
          })}
          {!shown.length && <div className="hint">לא נמצא גוון כזה בבלורן</div>}
        </div>
        <div className="hint">כל הגוונים מקולקציות בלורן (bluran.co.il). התמונה של הגוון מוצגת על הדלתות בתלת-ממד.</div>
      </div>
    </div>
  );
}

/** A small swatch button that opens the fan */
export function SwatchButton({ value, label, onClick, empty }: { value?: string; label: string; onClick: () => void; empty?: boolean }) {
  return (
    <button type="button" className="nqb-btn" onClick={onClick} title={value ? colorName(value) : label} aria-label={label}>
      <span className={`nqb-dot ${empty ? "empty" : ""}`} style={empty ? undefined : swatchStyle(value)} />
    </button>
  );
}
