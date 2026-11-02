import type { CatNode, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  biz: "NOYA Kitchens by Erez Hindi",
  owner: "ארז",
  vatId: "031672751",
  address: "מושב ניצני עוז",
  phone: "050-2808180",
  email: "erezhindi@gmail.com",
  web: "www.noya-k.co.il",
  vat: 18,
  validity: 30,
  payment: "50% בתחילת עבודה, 50% בסיום התקנה.",
  clauses: [
    "הסחורה נשארת בבעלות נויה מטבחים עד לפירעון מלא של התמורה.",
    "חתימת המזמין על הצעת מחיר זו מהווה אישור המפרט, המחיר, תנאי התשלום ותנאי העבודה.",
    "המזמין הינו האחראי הבלעדי לאישור המידות, המפרטים והשרטוטים.",
    "אין אחריות על עץ מלא או על חומר טבעי העלול להשתנות בגוון, בטקסטורה ובמבנה לאורך הזמן.",
  ].join("\n"),
  roundTo: 100,
  defaultCommissionPct: 5,
  reviewsGoogle: "https://www.google.com/maps?cid=18053665565514135117",
  reviewsMidrag: "https://www.midrag.co.il/SpCard/Sp/52824?areaId=4&serviceId=216",
  reviewAskGoogle: "https://share.google/DlkIEwVynx7sEg1Su",
  reviewAskB144: "https://www.b144.co.il/b144_sip/401D0D1A4370655D411D051B40/#opinionsDiv",
  leadAutoReply: true,
  followUpText:
    "שלום {שם},\nרציתי לבדוק אם יצא לך לעבור על הצעת המחיר ששלחתי{פרויקט}.\nאשמח לענות על כל שאלה, ואם צריך לשנות משהו בהצעה נעדכן אותה בשמחה.\nלצפייה בהצעה: {קישור}\n\n{בעלים}, נויה מטבחים",
  leadReplyText:
    "שלום {שם},\n\nתודה על פנייתך לנויה מטבחים. קיבלנו את הבקשה, ונחזור אליך עם הצעת מחיר תוך 2 ימי עסקים.\n\nבברכה,\nארז\nנויה מטבחים\n050-2808180",
};

/** Starting folder skeleton — Erez fills in the items and prices himself. */
export function defaultCatalog(): CatNode[] {
  const f = (id: string, parentId: string, name: string, extra: Partial<CatNode> = {}): CatNode => ({
    id,
    parentId,
    name,
    folder: true,
    ...extra,
  });
  return [
    f("body", "", "גוף ארונות"),
    f("fronts", "", "חזיתות"),
    f("finish", "", "גימורים ותוספות"),
    f("hw", "", "פרזול", { showQty: true }),
    f("hw-drawers", "hw", "מגירות"),
    f("hw-lifts", "hw", "קלפות"),
    f("hw-hinges", "hw", "צירים"),
    f("hw-corners", "hw", "פינות ושליפות"),
    f("hw-handles", "hw", "ידיות ותאורה"),
    f("special", "", "פריטים מיוחדים"),
    f("work", "", "עבודה ושירותים"),
  ];
}
