// What the catalog-photo tool asks the image model for. Shared by the screen (choices) and the server (prompt).

export type PhotoOpts = { counter: string; appliances: string[]; light: string; clean: boolean; styling: boolean; notes: string };

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

export function photoPrompt(o: PhotoOpts) {
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
    o.styling && "Add only a few minimal, tasteful styling props on the countertop (a ceramic bowl, a small plant, a cutting board). Keep it sparse.",
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
