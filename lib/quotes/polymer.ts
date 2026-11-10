// Bluran's polymer door models (קולקציית דלתות פולימר, bluran.co.il, 42 models). The picture of each one is in
// /public/bluran-doors/<id>.webp. The color comes from the Bluran fan (the "פולימר" group); the model is the door's
// design. style tells the 3D view and the drawing how to draw it, roughly:
//   flat   — a plain door with a shaped edge
//   frame  — a frame around a lower panel (shaker style); frame = its width in cm
//   boards — vertical boards / flutes over the whole door; boards = how many
//   frameBoards — a frame with vertical boards inside
//   vitrine — a frame with glass inside
export type PolymerStyle = "flat" | "frame" | "boards" | "frameBoards" | "vitrine";
export type PolymerModel = { id: string; name: string; style: PolymerStyle; frame?: number; boards?: number; /** a second line inside the frame (a stepped or moulded frame) */ double?: boolean; /** barn door: one diagonal brace or an X */ diag?: "one" | "x" };

export const POLYMER_MODELS: PolymerModel[] = [
  { id: "klen", name: "קלן", style: "boards", boards: 8 },
  { id: "panama", name: "פנמה", style: "boards", boards: 20 },
  { id: "berlin", name: "ברלין", style: "boards", boards: 9 },
  { id: "gauda-open", name: "גאודה ללא מסגרת", style: "boards", boards: 4 },
  { id: "acropolis", name: "אקרופוליס", style: "frame", frame: 9 },
  { id: "elize", name: "אליזה", style: "frame", frame: 9 },
  { id: "angli-light", name: "אנגלי לייט", style: "frame", frame: 4 },
  { id: "asam", name: "אסם", style: "frameBoards", frame: 6, boards: 5, diag: "one" },
  { id: "asam-hariz", name: "אסם חריץ", style: "frameBoards", frame: 6, boards: 5, diag: "x" },
  { id: "boston", name: "בוסטון", style: "frame", frame: 8 },
  { id: "dror", name: "דרור", style: "flat" },
  { id: "dror-medorag", name: "דרור מדורג", style: "flat" },
  { id: "england", name: "אינגלנד", style: "frame", frame: 5 },
  { id: "england-medorag", name: "אינגלנד מדורג", style: "frame", frame: 5 },
  { id: "firentze", name: "פירנצה", style: "frame", frame: 7 },
  { id: "gauda", name: "גאודה", style: "frameBoards", frame: 6, boards: 3 },
  { id: "gauda-medorag", name: "גאודה מדורג", style: "frameBoards", frame: 6, boards: 3 },
  { id: "kan", name: "קאן", style: "frame", frame: 11 },
  { id: "kan-hafuch", name: "קאן הפוך", style: "frame", frame: 11, double: true },
  { id: "korfu", name: "קורפו", style: "frame", frame: 1.5 },
  { id: "leeds", name: "לידס", style: "frame", frame: 5 },
  { id: "manchester", name: "מנצ'סטר", style: "frame", frame: 4 },
  { id: "miconos", name: "מיקונוס", style: "frame", frame: 5 },
  { id: "miconos-vitrina", name: "מיקונוס ויטרינה", style: "vitrine", frame: 5 },
  { id: "milano", name: "מילאנו", style: "frame", frame: 6, double: true },
  { id: "napoli", name: "נאפולי", style: "frame", frame: 7 },
  { id: "nis", name: "ניס", style: "frame", frame: 6 },
  { id: "papa", name: "פאפא", style: "frame", frame: 1.5 },
  { id: "paris", name: "פריז", style: "frame", frame: 5 },
  { id: "pireus", name: "פיראוס", style: "boards", boards: 2 },
  { id: "porta", name: "פורטה עובי 19 מ״מ", style: "flat" },
  { id: "rockfor", name: "רוקפור", style: "frame", frame: 6 },
  { id: "roma", name: "רומא", style: "frame", frame: 5 },
  { id: "saloniki", name: "סלוניקי", style: "frame", frame: 8, double: true },
  { id: "sardinia", name: "סרדיניה", style: "frame", frame: 8, double: true },
  { id: "shangrila", name: "שנגרילה", style: "frame", frame: 1.5 },
  { id: "sizilia", name: "סיציליה", style: "frame", frame: 8, double: true },
  { id: "sparta", name: "ספרטה", style: "frame", frame: 7 },
  { id: "toskana", name: "טוסקנה", style: "frame", frame: 8 },
  { id: "tripoli", name: "טריפולי", style: "frame", frame: 8 },
  { id: "tunis", name: "תוניס", style: "frame", frame: 1.5 },
  { id: "verona", name: "ורונה", style: "frame", frame: 9, double: true },
];

export const polymerOf = (id?: string) => (id ? POLYMER_MODELS.find((m) => m.id === id) : undefined);
export const polymerImg = (m: PolymerModel) => `/bluran-doors/${m.id}.webp`;

/** What to draw on one front of this size: the inner panel (frame) and the lines of the boards, in cm from its corner */
export function polymerDecor(m: PolymerModel | undefined, w: number, h: number) {
  if (!m || m.style === "flat") return null;
  // a small front (a drawer) gets a narrower frame so the panel still shows
  const f = m.frame ? Math.min(m.frame, w / 4, h / 4) : 0;
  const inner = m.style === "boards" ? null : { x: f, y: f, w: Math.max(1, w - 2 * f), h: Math.max(1, h - 2 * f) };
  const area = inner || { x: 0, y: 0, w, h };
  const n = m.style === "boards" || m.style === "frameBoards" ? Math.max(2, Math.round(((m.boards || 4) * w) / 60)) : 0;
  const lines = Array.from({ length: Math.max(0, n - 1) }, (_, i) => area.x + (area.w * (i + 1)) / n);
  const inner2 = m.double && inner && inner.w > 6 && inner.h > 6 ? { x: inner.x + 1.5, y: inner.y + 1.5, w: inner.w - 3, h: inner.h - 3 } : null;
  // the brace of a barn door, corner to corner of the panel (x0,y0 → x1,y1)
  const diags = m.diag && inner ? (m.diag === "x" ? [[inner.x, inner.y, inner.x + inner.w, inner.y + inner.h], [inner.x + inner.w, inner.y, inner.x, inner.y + inner.h]] : [[inner.x, inner.y + inner.h, inner.x + inner.w, inner.y]]) : [];
  return { inner, inner2, lines, diags, glass: m.style === "vitrine" };
}
