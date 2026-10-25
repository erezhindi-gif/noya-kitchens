// The quote agent: turns Erez's dictated or typed description into a draft quote built from his
// own catalog. It only drafts — Erez reviews and sends.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ancestors, kids, lineFrom, pathOf, uid } from "./calc";
import type { CatNode, Line } from "./types";

const DraftSchema = z.object({
  client_name: z.string(),
  client_phone: z.string(),
  project: z.string(),
  delivery: z.string(),
  notes: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          catalog_id: z.string(),
          quantities: z.array(z.number()),
        })
      ),
      custom_lines: z.array(z.object({ description: z.string(), qty: z.number(), price: z.number() })),
    })
  ),
  not_found: z.array(z.string()),
});
export type Draft = z.infer<typeof DraftSchema>;

/** One catalog entry per line: id, full path, the text that goes in the quote, and its priced levels. */
export function catalogForPrompt(cat: CatNode[]) {
  const pickable = cat.filter((n) => !n.folder || +(n.price || 0) > 0 || kids(cat, n.id).length === 0);
  return pickable
    .map((n) => {
      const levels = [...ancestors(cat, n), n]
        .filter((x) => +(x.price || 0) > 0)
        .map((x) => `${x.name || x.desc} (${x.unit === "m" ? "למטר" : "ליחידה"})`);
      return `${n.id} | ${pathOf(cat, n)}${n.desc ? ` | ${n.desc}` : ""}${n.aliases ? ` | כינויים: ${n.aliases}` : ""} | רמות עם מחיר: ${levels.length ? levels.join(" ; ") : "אין"}`;
    })
    .join("\n");
}

const SYSTEM = `אתה עוזר שבונה טיוטת הצעת מחיר לנגרייה "נויה מטבחים" מתוך תיאור חופשי (לרוב מוכתב בקול, ולכן יכול להכיל שגיאות הקלדה וכתיב מדובר) שמנהל העסק, ארז, כותב.

בקטלוג, כל פריט מופיע בשורה: מזהה | נתיב בעץ | תיאור | כינויים | רמות עם מחיר.
כללים:
- לכל דבר שארז מזכיר, בחר את הפריט המתאים ביותר מהקטלוג והחזר את המזהה שלו בדיוק כפי שהוא מופיע. עדיף הפריט העמוק והספציפי ביותר שמתאים (למשל צבע מסוים מתחת לסוג הגוף).
- quantities: מספר אחד לכל "רמה עם מחיר" של הפריט, לפי הסדר שבו הן רשומות. כמות במטרים לרמה "למטר" וביחידות לרמה "ליחידה". אם ארז נתן כמות אחת לפריט שיש לו כמה רמות (למשל חזית 4 מטר עם ידית), השתמש באותה כמות לכל הרמות, אלא אם אמר אחרת. פריט בלי רמות עם מחיר: מערך ריק.
- חלק את ההצעה לחלקים לפי מה שארז מתאר (מטבח, ארון קיר, ארון אמבטיה...). אם יש רק חלק אחד, תן לו כותרת לפי הפרויקט.
- custom_lines: רק לדבר שארז ציין במפורש עם מחיר ואין לו פריט בקטלוג. אחרת אל תמציא שורות ומחירים.
- not_found: כל דבר שארז הזכיר ולא מצאת לו פריט מתאים בקטלוג, במילים שלו.
- client_name / client_phone / project / delivery / notes: מה שנאמר, או מחרוזת ריקה. delivery רק אם ארז ציין זמן אספקה.
- אל תמציא פריטים, מזהים או כמויות שלא נאמרו. כשאין כמות, השתמש ב-1.`;

export async function draftQuote(text: string, cat: CatNode[], apiKey: string) {
  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
    system: [{ type: "text", text: SYSTEM }],
    messages: [
      {
        role: "user",
        content: `הקטלוג:\n${catalogForPrompt(cat)}\n\nהתיאור של ארז:\n${text}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("refused");
  const draft = response.parsed_output;
  if (!draft) throw new Error("no-draft");

  return linesFromDraft(draft, cat);
}

/** Turns the model's draft into quote lines through the same path as manual picking. */
export function linesFromDraft(draft: Draft, cat: CatNode[]) {
  const lines: Line[] = [];
  const notFound = [...draft.not_found];
  for (const sec of draft.sections) {
    if (draft.sections.length > 1 || sec.title) lines.push({ id: uid(), type: "head", qty: 1, price: 0, desc: sec.title || draft.project });
    for (const it of sec.items) {
      const node = cat.find((c) => c.id === it.catalog_id);
      if (!node) { notFound.push(it.catalog_id); continue; }
      const line = lineFrom(cat, node);
      if (line.parts?.length) line.parts.forEach((p, i) => { p.qty = it.quantities[i] ?? it.quantities[0] ?? 1; });
      else line.qty = it.quantities[0] ?? 1;
      lines.push(line);
    }
    for (const cl of sec.custom_lines)
      lines.push({ id: uid(), type: "free", qty: cl.qty || 1, price: cl.price || 0, desc: cl.description });
  }
  return {
    client: { name: draft.client_name, phone: draft.client_phone },
    project: draft.project,
    delivery: draft.delivery,
    notes: draft.notes,
    lines,
    notFound,
  };
}
