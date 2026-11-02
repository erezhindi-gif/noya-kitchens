// What the catalog-photo tool asks the image model for. Shared by the screen (choices) and the server (prompt).

export type PhotoOpts = { counter: string; appliances: string[]; light: string; clean: boolean; styling: boolean; notes: string; /** "pro": retouch a finished photo only, add nothing */ mode?: "catalog" | "pro" | "reshoot"; /** same seed = same styling (all photos of one kitchen) */ seed?: string };

/** A finished project photographed on a phone, made to look shot and finished by a top architectural photographer. */
const PRO_PROMPT = [
  "Retouch this real photo of a finished interior so it looks as if it was shot by a top architectural and interior photographer with a professional camera and then finished in a professional studio.",
  "ABSOLUTE RULE: keep everything real. Same cabinetry, furniture, doors, drawers, handles, countertops, appliances, materials, colors, finishes, proportions and room architecture. Same camera position and framing. Do not add, remove, move, resize or restyle anything, except removing small clutter such as cables, tools, bags, stickers and protective film.",
  "Improve only the photography: balanced exposure with detail in the windows and in the shadows, neutral true-to-life white balance, straight vertical lines (two-point perspective), crisp sharp detail, no noise or phone-camera artifacts, soft natural light with gentle shadows, clean reflections.",
  "Photorealistic, high-end architecture magazine quality. No text, no watermark.",
].join("\n");

export const COUNTERS: Record<string, { he: string; en: string }> = {
  calacatta: { he: "קוורץ לבן עם עורקים (קלקטה)", en: "a white Calacatta-look quartz countertop with soft grey veining, 2 cm thick" },
  white: { he: "קוורץ לבן חלק", en: "a plain pure-white quartz countertop, 2 cm thick" },
  concrete: { he: "אבן אפורה במראה בטון", en: "a light-grey concrete-look sintered stone countertop, 2 cm thick" },
  black: { he: "קוורץ שחור", en: "a matte black quartz countertop, 2 cm thick" },
  oak: { he: "משטח עץ אלון", en: "a natural oak wood countertop, 4 cm thick" },
  keep: { he: "יש כבר שיש (לא לשנות)", en: "" },
};

export const APPLIANCES: Record<string, { he: string; en: string }> = {
  sink: { he: "כיור וברז", en: "an undermount stainless-steel sink with a modern faucet, in the sink cabinet" },
  cooktop: { he: "כיריים", en: "a flush black glass induction cooktop above the cooktop/drawer cabinet" },
  oven: { he: "תנור בנוי", en: "a built-in black glass oven in any existing oven opening of the cabinets" },
  micro: { he: "מיקרוגל בנוי", en: "a built-in microwave in any existing microwave opening of a tall cabinet" },
  hood: { he: "קולט אדים", en: "a slim stainless or black cooker hood above the cooktop" },
  fridge: { he: "מקרר", en: "a modern stainless refrigerator in the empty fridge niche, only if such a niche exists" },
};

export const LIGHTS: Record<string, { he: string; en: string }> = {
  studio: { he: "סטודיו בהיר", en: "bright, soft and even professional studio lighting, neutral white balance, no harsh shadows" },
  warm: { he: "ערב חמים", en: "warm evening ambience with soft warm interior lights and gentle LED strip glow under the wall cabinets" },
  daylight: { he: "אור יום טבעי", en: "soft natural daylight from the windows, balanced exposure, airy and bright" },
};

/** A new professional shoot of the same room: better angle, light and a few accessories, carpentry untouched. */
const RESHOOT_PROMPT = [
  "Recreate this photo as a brand-new professional photograph of the exact same room, as if it was shot today (2026) by a top architectural interior photographer with a high-end full-frame camera and a tilt-shift lens, then finished in a professional studio.",
  "THE CARPENTRY IS SACRED: every cabinet, door, drawer, panel, shelf, handle, countertop, built-in appliance, material, color, finish and proportion must stay identical. Same number of units, same widths and heights, same order. The room architecture (walls, windows, ceiling, floor) stays identical.",
  "You may: choose a better, more professional camera position and angle (eye level about 1.3 m, straight verticals, a balanced composition that shows the kitchen at its best); improve the light (soft natural daylight with a gentle warm glow under the wall cabinets), exposure, color and sharpness; remove clutter; add a few subtle, tasteful accessories without covering the carpentry.",
  "The result must be a clearly NEW and better professional photograph, not the input photo with small changes: a new professional camera position and framing, new professional light, a clean finished look.",
  "Photorealistic, architecture-magazine quality. No text, no watermark.",
].join("\n");

/** Styling ideas; each shot gets a different few, so the site's kitchens don't all show the same props. */
const STYLING = [
  "white tulips in a tall clear glass vase", "a single olive branch in a slim ceramic vase", "a eucalyptus bunch in a stoneware jug",
  "a bowl of green apples", "a footed bowl of oranges", "a few pomegranates on a small brass tray", "a bunch of grapes in a shallow glass dish",
  "a white marble serving board with a loaf of sourdough bread", "a black slate tray with olive oil and vinegar bottles",
  "folded linen tea towels in a soft neutral color", "a matte ceramic kettle", "an espresso machine with two small cups",
  "a stack of matte stoneware plates", "two glass storage jars with pasta and coffee beans", "a cookbook open on a wooden book stand",
  "small potted herbs (basil and rosemary) in terracotta pots", "a bottle of wine with two glasses", "a low arrangement of white hydrangeas",
  "a ceramic pitcher with lavender", "a glass cake stand with a lemon cake",
];
/** Random numbers from a text: the same kitchen always gets the same "random" styling. */
function rng(seed?: string) {
  if (!seed) return Math.random;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export function pickStyling(n = 3, rand: () => number = Math.random) {
  const pool = [...STYLING];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out.join(", ");
}

/** Not every real shoot dresses the counters: about a third stay bare, most get one thing, a few get two. */
function reshootStyling(seed?: string) {
  const rand = rng(seed);
  const r = rand();
  if (r < 0.35) return "Accessories for this shot: none. Keep the countertops clean and almost empty, as delivered; do not add decor (removing clutter is fine).";
  return `Accessories for this shot: only ${pickStyling(r < 0.75 ? 1 : 2, rand)}, placed casually. Nothing else. Do not add a wooden cutting board.`;
}

/** So the photo reads as a real shoot and not as an AI edit. */
const NATURAL = "It must look like a real photograph, not a render or an AI image: real camera optics, natural light falloff and soft real shadows, believable reflections, subtle real-world imperfections, nothing too perfect, too symmetrical, too glossy or over-styled.";

export function photoPrompt(o: PhotoOpts) {
  if (o.mode === "reshoot") return RESHOOT_PROMPT + `\n${reshootStyling(o.seed)}\n${NATURAL}` + (o.notes?.trim() ? `\nInstructions from the kitchen maker for this photo (Hebrew, follow them exactly, they override the above, except the carpentry rule and the professional architectural composition, which always apply: straight verticals, a proper camera height and a balanced, magazine-quality framing): ${o.notes.trim()}` : "");
  if (o.mode === "pro") return PRO_PROMPT + (o.notes?.trim() ? `\nNotes from the kitchen maker (Hebrew, follow them): ${o.notes.trim()}` : "");
  const counter = COUNTERS[o.counter] || COUNTERS.calacatta;
  const add = [
    counter.en && `Add ${counter.en} on top of every base cabinet, following the exact outline of the cabinets with a small front overhang, plus a matching backsplash only if the wall behind is bare plaster.`,
    ...o.appliances.map((k) => APPLIANCES[k]?.en).filter(Boolean).map((t) => `Add ${t}.`),
  ].filter(Boolean);
  return [
    "Edit this photo of a newly installed custom kitchen into a high-end interior-design catalog photograph.",
    "ABSOLUTE RULE: the carpentry must stay exactly as it is in the photo. Keep every cabinet, door, drawer, panel, shelf, handle and gap in the same position, size, proportion, color, finish and material. Do not add, remove, move, resize, restyle or recolor any cabinet, door, drawer or handle. Keep the same camera position, angle, lens and framing, and the same room architecture (walls, windows, doors, ceiling).",
    ...add,
    o.clean && "Remove construction mess: tools, boxes, packaging, protective film and stickers, dust, cables, ladders and people. Make the floor clean and finished.",
    o.styling && `Add only a few minimal, tasteful styling props on the countertop: ${pickStyling()}. Keep it sparse. No wooden cutting board.`,
    `Lighting: ${(LIGHTS[o.light] || LIGHTS.studio).en}.`,
    "Photorealistic, sharp focus, true-to-life colors, magazine quality. No text, no watermark.",
    o.notes.trim() && `Notes from the kitchen maker (Hebrew, follow them): ${o.notes.trim()}`,
  ].filter(Boolean).join("\n");
}

const RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
/** The supported aspect ratio closest to the photo's own shape, so nothing is cropped or stretched. */
export function nearestRatio(w: number, h: number) {
  const r = w / h;
  return RATIOS.reduce((best, x) => {
    const [a, b] = x.split(":").map(Number);
    const [c, d] = best.split(":").map(Number);
    return Math.abs(Math.log(a / b / r)) < Math.abs(Math.log(c / d / r)) ? x : best;
  }, "4:3");
}

/** Ready-made shot types for re-shoots, best first for selling a custom kitchen; the text goes to the model as notes. */
export const SHOT_PRESETS = [
  { label: "פינתי 45°", kind: "angle", text: "צילום אלכסוני מהפינה בזווית של כ-45 מעלות, שמראה עומק ושני קירות" },
  { label: "זווית רחבה", kind: "angle", text: "צילום רחב מהצד הנגדי של החדר, שמראה את כל המטבח בפריים אחד" },
  { label: "אור בוקר", kind: "light", text: "אור בוקר טבעי ורך שנכנס מהחלון, צללים עדינים" },
  { label: "גובה עיניים", kind: "angle", text: "מצלמה בגובה עיניים של אדם עומד, כמו שלקוח רואה את המטבח כשהוא נכנס" },
  { label: "מגזין עיצוב", kind: "style", text: "סגנון צילום של מגזין עיצוב פנים יוקרתי: קומפוזיציה נקייה, הרבה אוויר, צבעים מדויקים" },
  { label: "תקריב פרטים", kind: "angle", text: "צילום תקריב של פרט נגרות מרשים (ידיות, חיבור חזיתות, פינה), עומק שדה רדוד ורקע מטושטש" },
  { label: "חזיתי סימטרי", kind: "angle", text: "צילום חזיתי ישר מול הקיר המרכזי, סימטרי, קווים אופקיים ואנכיים ישרים לגמרי" },
  { label: "צמחייה", kind: "style", text: "להוסיף רק צמח ירוק אחד או ענף באגרטל, בלי שום פריט אחר" },
  { label: "בלי אקססוריז", kind: "style", text: "בלי שום אקססוריז או קישוטים, שיש נקי לגמרי כמו ביום המסירה" },
  { label: "קרני שמש", kind: "light", text: "קרני שמש חמות ועדינות נכנסות מהחלון ונופלות על הרצפה והשיש" },
  { label: "ערב חמים", kind: "light", text: "תאורת ערב חמימה: פס לד דולק מתחת לארונות העליונים ותאורת תקרה עמומה, בחוץ חשוך" },
] as const;
