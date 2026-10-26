// The quote connector (MCP) that Erez adds to his Claude account. Claude can read the catalog,
// build draft quotes and look up quotes — it never sends anything to clients.
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { calc, defaultCommissions, fdate, lineTotal, money, qnum, STATUS_LABEL, todayIL, uid } from "@/lib/quotes/calc";
import { catalogForPrompt, linesFromDraft } from "@/lib/quotes/agent";
import { getData, getSecrets, putQuote } from "@/lib/quotes/store";
import { passwordStamp, verifyPayload } from "@/lib/quotes/auth";
import type { Quote } from "@/lib/quotes/types";

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

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_catalog",
      {
        title: "חיפוש בקטלוג של נויה מטבחים",
        description:
          "מחזיר את פריטי הקטלוג: מזהה | נתיב | התיאור שנכתב בהצעה | כינויים | רמות עם מחיר. " +
          "חובה להשתמש בו לפני create_quote_draft, כדי לבחור מזהים אמיתיים. אפשר לסנן במילת חיפוש (לפי שם, תיאור או כינוי), או להשאיר ריק לכל הקטלוג.",
        inputSchema: z.object({ query: z.string().default("").describe("מילת חיפוש, או ריק") }),
        annotations: { readOnlyHint: true },
      },
      async ({ query }) => {
        const { cat } = await getData();
        const all = catalogForPrompt(cat).split("\n");
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
        description: "כל הפרטים של הצעה אחת לפי המספר שלה (למשל NQ261025-05): שורות, כמויות, מחירים פנימיים וסכומים.",
        inputSchema: z.object({ number: z.string().describe("מספר ההצעה, למשל NQ261025-05") }),
        annotations: { readOnlyHint: true },
      },
      async ({ number }) => {
        const d = await getData();
        const q = d.quotes.find((x) => qnum(x).toLowerCase() === number.trim().toLowerCase());
        if (!q) return text(`לא נמצאה הצעה ${number}.`);
        const c = calc(q, d.settings, d.pros);
        const lines = q.lines.map((l) =>
          l.type === "head" ? `## ${l.desc}` : `- ${l.desc}${lineTotal(l) ? ` — ${money(lineTotal(l))}` : ""}`
        );
        return text(
          [
            `${qnum(q)} · ${q.client.name} ${q.client.phone} · ${q.project} · ${STATUS_LABEL[q.status]}`,
            ...lines,
            `עלות: ${money(c.base)} · ללקוח לפני מע״מ: ${money(c.price)} · כולל מע״מ: ${money(c.total)}`,
            `קישור: ${SITE}/admin?q=${q.id}`,
          ].join("\n")
        );
      }
    );
  },
  {
    serverInfo: { name: "noya-quotes", version: "1.2.0" },
    instructions:
      "מערכת הצעות המחיר של נויה מטבחים (ארז). תהליך: 1) search_catalog כדי למצוא את הפריטים. " +
      "2) אם חסרה כמות לרכיב כלשהו (למשל ידית לחזיתות), או שיש כמה פריטים אפשריים, שאל את ארז שאלה אחת מרוכזת עם כל החסרים — לפני שבונים. " +
      "3) create_quote_draft רק כשהכול ברור. אל תנחש כמויות ואל תעתיק כמות בין רכיבים. " +
      "כל טיוטה מקבלת אוטומטית את העמלה הקבועה; remove_commission=true רק אם ארז ביקש במפורש בלי עמלה. דבר עם ארז בעברית.",
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
