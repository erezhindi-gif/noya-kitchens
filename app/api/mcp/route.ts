// The quote connector (MCP) that Erez adds to his Claude account. Claude can read the catalog,
// build draft quotes and look up quotes — it never sends anything to clients.
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { calc, defaultCommissions, fdate, lineTotal, markSentFields, money, pathOf, qnum, STATUS_LABEL, todayIL, uid, waLink } from "@/lib/quotes/calc";
import { catalogForPrompt, linesFromDraft } from "@/lib/quotes/agent";
import { getData, getSecrets, putCatalog, putQuote } from "@/lib/quotes/store";
import { passwordStamp, verifyPayload } from "@/lib/quotes/auth";
import type { CatNode, Quote } from "@/lib/quotes/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE = process.env.SITE_URL || "https://www.noya-k.co.il";
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const SectionSchema = z.object({
  title: z.string().describe("כותרת החלק, למשל מטבח, ארון קיר, ארון אמבטיה"),
  items: z
    .array(
      z.object({
        catalog_id: z.string().describe("המזהה של הפריט מתוך search_catalog, בדיוק כפי שהוא"),
        quantities: z
          .array(z.number())
          .describe("כמות אחת לכל 'רמה עם מחיר' של הפריט, לפי הסדר: מטרים לרמה למטר, יחידות לרמה ליחידה. כל כמות חייבת להיות כזו שארז אמר במפורש או אישר. אסור להעתיק כמות מרמה אחת לאחרת בלי לשאול"),
      })
    )
    .default([]),
  custom_lines: z
    .array(z.object({ description: z.string(), qty: z.number(), price: z.number() }))
    .default([])
    .describe("רק לדבר שארז ציין במפורש עם מחיר ואין לו פריט בקטלוג"),
});

const findQuote = (quotes: Quote[], ref: string) => {
  const r = ref.trim().toLowerCase();
  return quotes.find((q) => qnum(q).toLowerCase() === r || q.id === r);
};

/** The quote as Claude sees it: every line numbered, components with their quantities and prices. */
function describeQuote(q: Quote, d: Awaited<ReturnType<typeof getData>>) {
  const c = calc(q, d.settings, d.pros);
  const unit = (u?: string) => (u === "m" ? "מ׳" : "יח׳");
  const lines = q.lines.map((l, i) => {
    if (l.type === "head") return `[${i + 1}] ## ${l.desc}`;
    const parts = l.parts?.length
      ? " — " + l.parts.map((p) => `${p.name} ${p.qty} ${unit(p.unit)} × ${money(p.price)}`).join(" + ")
      : l.type === "lump" ? ` — מחיר כולל ${money(l.price)}`
      : l.type === "text" ? ""
      : ` — ${l.qty} ${unit(l.unit)} × ${money(l.price)}`;
    return `[${i + 1}] ${l.desc}${parts}${lineTotal(l) ? ` = ${money(lineTotal(l))}` : ""}`;
  });
  const coms = (q.commissions || []).filter((x) => +x.pct > 0).map((x) => `${x.name || "עמלה"} ${x.pct}%`).join(", ");
  return [
    `${qnum(q)} · ${q.client.name} ${q.client.phone} · ${q.project} · ${STATUS_LABEL[q.status]}`,
    ...lines,
    q.delivery ? `אספקה: ${q.delivery}` : "",
    `עמלות: ${coms || "אין"} · עלות: ${money(c.base)} · ללקוח לפני מע״מ: ${money(c.price)} · כולל מע״מ: ${money(c.total)}`,
    `קישור: ${SITE}/admin?q=${q.id}`,
  ].filter(Boolean).join("\n");
}

const catRow = (cat: CatNode[], n: CatNode) =>
  `${n.id} | ${pathOf(cat, n)}${n.folder ? " (תיקייה)" : ""}${n.desc ? ` | תיאור: ${n.desc}` : ""}${+(n.price || 0) > 0 ? ` | ${money(+n.price!)} ${n.unit === "m" ? "למטר" : "ליחידה"}` : ""}${n.aliases ? ` | כינויים: ${n.aliases}` : ""}`;

const NodeFields = {
  name: z.string().optional().describe("שם קצר בקטלוג"),
  description: z.string().optional().describe("התיאור שהלקוח רואה בהצעה"),
  unit: z.enum(["m", "u"]).optional().describe("m = למטר, u = ליחידה"),
  price: z.number().optional().describe("מחיר עלות של הרמה הזאת; 0 = בלי מחיר"),
  aliases: z.string().optional().describe("כינויים לחיפוש, מופרדים בפסיק"),
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_catalog",
      {
        title: "חיפוש בקטלוג של נויה מטבחים",
        description:
          "מחזיר את פריטי הקטלוג: מזהה | נתיב | התיאור שנכתב בהצעה | כינויים | רמות עם מחיר. " +
          "חובה להשתמש בו לפני create_quote_draft, כדי לבחור מזהים אמיתיים. אפשר לסנן במילת חיפוש (לפי שם, תיאור או כינוי), או להשאיר ריק לכל הקטלוג.",
        inputSchema: z.object({
          query: z.string().default("").describe("מילת חיפוש, או ריק"),
          full_tree: z.boolean().default(false).describe("true לעריכת הקטלוג: כל הצמתים כולל תיקיות, עם יחידה ומחיר של כל רמה"),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ query, full_tree }) => {
        const { cat } = await getData();
        const all = full_tree ? cat.map((n) => catRow(cat, n)) : catalogForPrompt(cat).split("\n");
        const q = query.trim().toLowerCase();
        const rows = q ? all.filter((r) => r.toLowerCase().includes(q)) : all;
        return text(rows.length ? rows.join("\n") : `לא נמצאו פריטים עבור "${query}". נסה מילה אחרת או חיפוש ריק לכל הקטלוג.`);
      }
    );

    server.registerTool(
      "create_quote_draft",
      {
        title: "בניית טיוטת הצעת מחיר",
        description:
          "שומר טיוטת הצעה חדשה במערכת של ארז (סטטוס טיוטה, לא נשלחת ללקוח). " +
          "הפריטים חייבים להיות מזהים מ-search_catalog. " +
          "לפני הקריאה: אם לפריט יש כמה 'רמות עם מחיר' (למשל חזית + ידית) וארז נתן כמות רק לחלק מהן, שאל אותו על הכמות החסרה ואל תנחש. " +
          "אם כמה פריטים בקטלוג מתאימים לאותה בקשה, שאל איזה מהם. קרא לכלי רק אחרי שכל הכמויות והבחירות ברורות. " +
          "אחרי השמירה, הצג לארז את הסיכום והקישור, וכל מה שלא נמצא בקטלוג.",
        inputSchema: z.object({
          client_name: z.string(),
          client_phone: z.string().default(""),
          project: z.string().describe("שם כללי לפרויקט, למשל 'דירה ברח׳ הרצל' או 'מטבח'"),
          delivery: z.string().default("").describe("זמן אספקה אם נאמר, למשל 'אספקה 45 ימי עבודה'"),
          notes: z.string().default("").describe("הערות ללקוח, שיופיעו בהצעה"),
          sections: z.array(SectionSchema),
          not_found: z.array(z.string()).default([]).describe("דברים שארז ביקש ואין להם פריט בקטלוג"),
          remove_commission: z.boolean().default(false).describe("true רק אם ארז ביקש במפורש בלי עמלה. אחרת כל הצעה מקבלת את העמלה הקבועה"),
        }),
      },
      async (args) => {
        const data = await getData();
        const { lines, notFound } = linesFromDraft(
          { client_name: args.client_name, client_phone: args.client_phone, project: args.project, delivery: args.delivery,
            notes: args.notes, sections: args.sections, not_found: args.not_found },
          data.cat
        );
        const date = todayIL();
        const seq = data.quotes.filter((q) => q.date === date).reduce((m, q) => Math.max(m, q.seq), 0) + 1;
        const q: Quote = {
          id: uid(12), date, seq, status: "draft",
          client: { name: args.client_name, phone: args.client_phone },
          project: args.project, lines, pros: [], round: false,
          commissions: args.remove_commission ? [] : defaultCommissions(data.settings),
          delivery: args.delivery || "אספקה 45 ימי עבודה",
          notes: args.notes,
          internalNotes: notFound.length ? `לא נמצא בקטלוג (להשלים): ${notFound.join(", ")}` : "",
        };
        await putQuote(q);
        const c = calc(q, data.settings, data.pros);
        return text(
          [
            `נשמרה טיוטה ${qnum(q)} ללקוח ${q.client.name}.`,
            `סה״כ לפני מע״מ: ${money(c.price)} · כולל מע״מ: ${money(c.total)}${q.commissions?.length ? ` · כולל עמלה קבועה ${q.commissions[0].pct}%` : " · בלי עמלה"}.`,
            `שורות: ${lines.filter((l) => l.type !== "head").length}.`,
            notFound.length ? `לא נמצא בקטלוג: ${notFound.join(", ")}.` : "",
            `לפתיחה ועריכה: ${SITE}/admin?q=${q.id}`,
          ].filter(Boolean).join("\n")
        );
      }
    );

    server.registerTool(
      "add_to_quote",
      {
        title: "הוספה להצעה קיימת",
        description:
          "מוסיף פריטים להצעה קיימת (לפי מספר ההצעה). חלק עם אותה כותרת כמו חלק קיים — הפריטים נכנסים לסוף אותו חלק; כותרת חדשה — נפתח חלק חדש בסוף. " +
          "אותם כללים כמו בבנייה: מזהים מ-search_catalog, ולשאול על כמויות חסרות לפני הקריאה. לא ניתן לשנות הצעה שהלקוח כבר אישר.",
        inputSchema: z.object({
          number: z.string().describe("מספר ההצעה, למשל NQ261025-05 (אפשר למצוא עם list_quotes)"),
          sections: z.array(SectionSchema),
          not_found: z.array(z.string()).default([]),
        }),
      },
      async ({ number, sections, not_found }) => {
        const d = await getData();
        const q = findQuote(d.quotes, number);
        if (!q) return text(`לא נמצאה הצעה ${number}.`);
        if (q.status === "approved") return text(`ההצעה ${qnum(q)} כבר אושרה על ידי הלקוח ולא משנים אותה. אפשר לבנות הצעה חדשה.`);
        const missing = [...not_found];
        for (const sec of sections) {
          const { lines, notFound } = linesFromDraft(
            { client_name: "", client_phone: "", project: q.project, delivery: "", notes: "", sections: [sec], not_found: [] },
            d.cat
          );
          missing.push(...notFound);
          const body = lines[0]?.type === "head" ? lines.slice(1) : lines;
          const title = sec.title.trim();
          const headAt = title ? q.lines.findIndex((l) => l.type === "head" && l.desc.trim() === title) : -1;
          if (headAt >= 0) {
            let end = headAt + 1;
            while (end < q.lines.length && q.lines[end].type !== "head") end++;
            q.lines.splice(end, 0, ...body);
          } else if (!title) {
            q.lines.push(...body);
          } else {
            q.lines.push({ id: uid(), type: "head" as const, qty: 1, price: 0, desc: title }, ...body);
          }
        }
        if (missing.length) q.internalNotes = [q.internalNotes, `לא נמצא בקטלוג (להשלים): ${missing.join(", ")}`].filter(Boolean).join("\n");
        await putQuote(q);
        return text(`עודכנה ההצעה.\n${missing.length ? `לא נמצא בקטלוג: ${missing.join(", ")}\n` : ""}${describeQuote(q, d)}`);
      }
    );

    server.registerTool(
      "update_quote",
      {
        title: "עריכת הצעה קיימת",
        description:
          "משנה הצעה קיימת: כמויות של שורה (לפי מספר השורה מ-get_quote), תיאור שורה, הסרת שורות, ופרטי לקוח/פרויקט/אספקה/הערות/עמלה. " +
          "קרא קודם ל-get_quote כדי לדעת את מספרי השורות. אל תנחש כמויות. לא ניתן לשנות הצעה שהלקוח כבר אישר.",
        inputSchema: z.object({
          number: z.string(),
          set_quantities: z
            .array(z.object({ line: z.number().int(), quantities: z.array(z.number()).describe("כמות לכל רכיב בשורה לפי הסדר; לשורה בלי רכיבים — מספר אחד") }))
            .default([]),
          set_descriptions: z.array(z.object({ line: z.number().int(), description: z.string() })).default([]),
          remove_lines: z.array(z.number().int()).default([]).describe("מספרי שורות להסרה"),
          client_name: z.string().optional(),
          client_phone: z.string().optional(),
          project: z.string().optional(),
          delivery: z.string().optional(),
          notes: z.string().optional(),
          commission_pct: z.number().optional().describe("העמלה הקבועה באחוזים; 0 = בלי עמלה"),
        }),
      },
      async (a) => {
        const d = await getData();
        const q = findQuote(d.quotes, a.number);
        if (!q) return text(`לא נמצאה הצעה ${a.number}.`);
        if (q.status === "approved") return text(`ההצעה ${qnum(q)} כבר אושרה על ידי הלקוח ולא משנים אותה.`);
        const bad: number[] = [];
        const at = (n: number) => { const l = q.lines[n - 1]; if (!l) bad.push(n); return l; };
        for (const s of a.set_quantities) {
          const l = at(s.line);
          if (!l) continue;
          if (l.parts?.length) l.parts.forEach((p, i) => { if (s.quantities[i] !== undefined) p.qty = s.quantities[i]; });
          else if (s.quantities[0] !== undefined) l.qty = s.quantities[0];
        }
        for (const s of a.set_descriptions) { const l = at(s.line); if (l) l.desc = s.description; }
        if (a.remove_lines.length) {
          const drop = new Set(a.remove_lines.map((n) => at(n)?.id).filter(Boolean));
          q.lines = q.lines.filter((l) => !drop.has(l.id));
        }
        if (a.client_name !== undefined) q.client.name = a.client_name;
        if (a.client_phone !== undefined) q.client.phone = a.client_phone;
        if (a.project !== undefined) q.project = a.project;
        if (a.delivery !== undefined) q.delivery = a.delivery;
        if (a.notes !== undefined) q.notes = a.notes;
        if (a.commission_pct !== undefined) {
          const rest = (q.commissions || []).slice(1);
          q.commissions = a.commission_pct > 0 ? [{ name: "עמלה קבועה", pct: a.commission_pct }, ...rest] : rest;
        }
        await putQuote(q);
        return text(`${bad.length ? `שים לב: אין שורות במספרים ${bad.join(", ")}.\n` : ""}עודכנה ההצעה.\n${describeQuote(q, d)}`);
      }
    );

    server.registerTool(
      "edit_catalog",
      {
        title: "עריכת הקטלוג",
        description:
          "מוסיף פריטים ותתי-פריטים לקטלוג ומעדכן פריטים קיימים (שם, תיאור, יחידה, מחיר, כינויים). " +
          "קודם search_catalog עם full_tree=true כדי לראות את העץ והמזהים. מחירים רק כפי שארז אמר במפורש — לא מחשבים אחוזים בעצמך אלא אם ביקש. " +
          "לפני הקריאה, הצג לארז בקצרה מה ישתנה ובקש אישור.",
        inputSchema: z.object({
          add: z
            .array(z.object({
              ref: z.string().optional().describe("כינוי זמני, כדי שפריט אחר באותה קריאה יוכל להיות תת-פריט שלו"),
              parent: z.string().describe("מזהה של פריט קיים, ref של פריט שנוסף בקריאה הזאת, או ריק לרמה העליונה"),
              name: z.string(),
              description: NodeFields.description,
              unit: NodeFields.unit,
              price: NodeFields.price,
              aliases: NodeFields.aliases,
              folder: z.boolean().default(false).describe("true לתיקייה מארגנת בלבד, ששמה לא מופיע בהצעה"),
            }))
            .default([]),
          update: z.array(z.object({ id: z.string(), ...NodeFields })).default([]),
        }),
      },
      async ({ add, update }) => {
        const { cat } = await getData();
        const refs = new Map<string, string>();
        const errors: string[] = [];
        const added: CatNode[] = [];
        for (const a of add) {
          const parentId = !a.parent ? "" : refs.get(a.parent) ?? (cat.some((n) => n.id === a.parent) ? a.parent : null);
          if (parentId === null) { errors.push(`"${a.name}": לא נמצא פריט אב ${a.parent}`); continue; }
          const n: CatNode = { id: uid(), parentId, name: a.name.trim(), folder: a.folder };
          if (a.description) n.desc = a.description.trim();
          if (a.price) { n.price = a.price; n.unit = a.unit || "u"; } else if (a.unit) n.unit = a.unit;
          if (a.aliases) n.aliases = a.aliases;
          cat.push(n);
          added.push(n);
          if (a.ref) refs.set(a.ref, n.id);
        }
        const changed: CatNode[] = [];
        for (const u of update) {
          const n = cat.find((x) => x.id === u.id);
          if (!n) { errors.push(`לא נמצא פריט ${u.id}`); continue; }
          if (u.name !== undefined) n.name = u.name.trim();
          if (u.description !== undefined) n.desc = u.description.trim();
          if (u.unit !== undefined) n.unit = u.unit;
          if (u.price !== undefined) { n.price = u.price; if (u.price && !n.unit) n.unit = "u"; }
          if (u.aliases !== undefined) n.aliases = u.aliases;
          changed.push(n);
        }
        if (added.length || changed.length) await putCatalog(cat);
        return text([
          added.length ? "נוספו:\n" + added.map((n) => catRow(cat, n)).join("\n") : "",
          changed.length ? "עודכנו:\n" + changed.map((n) => catRow(cat, n)).join("\n") : "",
          errors.length ? "לא בוצע:\n" + errors.join("\n") : "",
          "הצעות קיימות לא משתנות; המחירים החדשים חלים על פריטים שיתווספו מעכשיו.",
        ].filter(Boolean).join("\n\n"));
      }
    );

    server.registerTool(
      "whatsapp_link",
      {
        title: "קישור וואטסאפ ללקוח",
        description:
          "מחזיר קישור שפותח וואטסאפ אל הלקוח עם הודעה מוכנה וקישור להצעה, ומסמן את ההצעה כנשלחה (מתחיל מעקב). " +
          "קרא רק כשארז ביקש לשלוח. הצג לו את הקישור כקישור ללחיצה — השליחה עצמה היא לחיצה שלו בוואטסאפ.",
        inputSchema: z.object({ number: z.string() }),
      },
      async ({ number }) => {
        const d = await getData();
        const q = findQuote(d.quotes, number);
        if (!q) return text(`לא נמצאה הצעה ${number}.`);
        if (!q.client.phone.replace(/\D/g, "")) return text(`אין טלפון ללקוח בהצעה ${qnum(q)}. בקש מארז את המספר ועדכן עם update_quote.`);
        const c = calc(q, d.settings, d.pros);
        const link = waLink(q, d.settings, c.total, SITE);
        const wasDraft = q.status === "draft";
        markSentFields(q);
        if (wasDraft) await putQuote(q);
        return text(`לשליחה ל${q.client.name}: ${link}\n${wasDraft ? "ההצעה סומנה כנשלחה, תזכורת מעקב בעוד 5 ימים." : `סטטוס: ${STATUS_LABEL[q.status]}.`}`);
      }
    );

    server.registerTool(
      "list_quotes",
      {
        title: "רשימת הצעות המחיר",
        description: "ההצעות האחרונות עם מספר, לקוח, פרויקט, סטטוס וסכום. אפשר לסנן לפי סטטוס או חיפוש חופשי.",
        inputSchema: z.object({
          status: z.enum(["all", "draft", "sent", "approved", "rejected"]).default("all"),
          search: z.string().default(""),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ status, search }) => {
        const d = await getData();
        const s = search.trim();
        const rows = d.quotes
          .filter((q) => status === "all" || q.status === status)
          .filter((q) => !s || `${q.client.name} ${q.project} ${qnum(q)} ${q.client.phone}`.includes(s))
          .sort((a, b) => qnum(b).localeCompare(qnum(a)))
          .slice(0, 30)
          .map((q) => {
            const c = calc(q, d.settings, d.pros);
            return `${qnum(q)} | ${fdate(q.date)} | ${q.client.name || "ללא שם"} | ${q.project} | ${STATUS_LABEL[q.status]} | ${money(c.price)} לפני מע״מ`;
          });
        return text(rows.length ? rows.join("\n") : "אין הצעות שמתאימות.");
      }
    );

    server.registerTool(
      "get_quote",
      {
        title: "פרטי הצעה",
        description: "כל הפרטים של הצעה אחת לפי המספר שלה (למשל NQ261025-05): שורות ממוספרות [1], [2]…, רכיבים, כמויות, מחירים פנימיים, עמלות וסכומים. מספרי השורות משמשים לעריכה עם update_quote.",
        inputSchema: z.object({ number: z.string().describe("מספר ההצעה, למשל NQ261025-05") }),
        annotations: { readOnlyHint: true },
      },
      async ({ number }) => {
        const d = await getData();
        const q = findQuote(d.quotes, number);
        if (!q) return text(`לא נמצאה הצעה ${number}.`);
        return text(describeQuote(q, d));
      }
    );
  },
  {
    serverInfo: { name: "noya-quotes", version: "1.4.0" },
    instructions:
      "מערכת הצעות המחיר של נויה מטבחים (ארז). תהליך: 1) search_catalog כדי למצוא את הפריטים. " +
      "2) אם חסרה כמות לרכיב כלשהו (למשל ידית לחזיתות), או שיש כמה פריטים אפשריים, שאל את ארז שאלה אחת מרוכזת עם כל החסרים — לפני שבונים. " +
      "3) create_quote_draft רק כשהכול ברור. אל תנחש כמויות ואל תעתיק כמות בין רכיבים. " +
      "כל טיוטה מקבלת אוטומטית את העמלה הקבועה; remove_commission=true רק אם ארז ביקש במפורש בלי עמלה. " +
      "להוספה להצעה קיימת: add_to_quote. לשינוי כמויות, תיאורים, הסרת שורות או פרטים: get_quote ואז update_quote. לא בונים הצעה חדשה כשארז ביקש לשנות קיימת. אם ארז רוצה לשנות הצעה ולא אמר איזו: list_quotes, הצג לו רשימה ממוספרת קצרה (מספר, לקוח, פרויקט, סכום) ושאל איזו, ורק אחר כך get_quote.  לשליחה ללקוח: whatsapp_link. לעריכת הקטלוג (פריטים, תתי-פריטים, מחירים): search_catalog עם full_tree=true ואז edit_catalog, אחרי שארז אישר את השינויים. דבר עם ארז בעברית.",
  }
);

// Only tokens issued by this site's sign-in, for the current password.
const verify = async (_req: Request, token?: string) => {
  if (!token) return undefined;
  const t = await verifyPayload<{ t: string; cid: string; ps: string; exp: number }>(token);
  if (!t || t.t !== "at" || t.ps !== (await passwordStamp(await getSecrets()))) return undefined;
  return { token, clientId: t.cid, scopes: ["quotes"], expiresAt: Math.floor(t.exp / 1000) };
};

const authed = withMcpAuth(handler, verify, { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource" });
export { authed as GET, authed as POST, authed as DELETE };
