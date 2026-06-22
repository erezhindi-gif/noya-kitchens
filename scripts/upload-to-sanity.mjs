import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = createClient({
  projectId: "5wc1kx4k",
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const categories = [
  { slug: "kitchens",    title: "מטבחים",              value: "מטבחים",              prefix: "kitchen" },
  { slug: "bathrooms",   title: "ארונות אמבטיה",       value: "ארונות אמבטיה",       prefix: "bathroom" },
  { slug: "kids",        title: "חדרי ילדים",          value: "חדרי ילדים",          prefix: "kids" },
  { slug: "wall-units",  title: "ארונות קיר",          value: "ארונות קיר",          prefix: "wall" },
  { slug: "entrance",    title: "ארונות כניסה",        value: "ארונות כניסה",        prefix: "entrance" },
  { slug: "buffet",      title: "מזנונים ושולחנות סלון", value: "מזנונים ושולחנות סלון", prefix: "buffet" },
  { slug: "kitchenette", title: "מטבחונים",            value: "מטבחונים",            prefix: "kitchenette" },
];

async function uploadImage(filePath) {
  const buffer = fs.readFileSync(filePath);
  const asset = await client.assets.upload("image", buffer, {
    filename: path.basename(filePath),
    contentType: "image/jpeg",
  });
  return asset._id;
}

async function main() {
  console.log("מעלה תמונות ל-Sanity...\n");

  for (const cat of categories) {
    const dir = path.join(__dirname, "..", "public", "images", cat.slug);
    if (!fs.existsSync(dir)) { console.log(`⚠️  תיקייה לא קיימת: ${cat.slug}`); continue; }

    const files = fs.readdirSync(dir).filter(f => f.endsWith(".jpg") || f.endsWith(".jpeg")).sort();
    console.log(`📁 ${cat.title} — ${files.length} תמונות`);

    const imageRefs = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      process.stdout.write(`  ↑ ${file}... `);
      try {
        const assetId = await uploadImage(filePath);
        imageRefs.push({
          _type: "image",
          _key: assetId,
          asset: { _type: "reference", _ref: assetId },
          alt: `${cat.title} — NOYA מטבחים ארז הנדי`,
        });
        process.stdout.write("✓\n");
      } catch (e) {
        process.stdout.write(`✗ ${e.message}\n`);
      }
    }

    // Create project document
    await client.createOrReplace({
      _type: "project",
      _id: `project-${cat.slug}`,
      title: cat.title,
      category: cat.value,
      images: imageRefs,
      featured: cat.slug === "kitchens",
      order: categories.indexOf(cat) + 1,
    });
    console.log(`  ✅ נוצר פרויקט: ${cat.title}\n`);
  }

  // Create site settings
  await client.createOrReplace({
    _type: "siteSettings",
    _id: "siteSettings",
    heroTitle: "מטבחים ונגרות בהתאמה אישית",
    heroSubtitle: "תכנון, ייצור והתקנה בליווי אישי של ארז הנדי — מעל 30 שנות ניסיון, רמת גימור גבוהה ופרזול BLUM כסטנדרט.",
    phone: "050-2808180",
    whatsapp: "972502808180",
    email: "erezhindi@gmail.com",
    address: "המלאכה 4, נתניה",
    facebookUrl: "https://www.facebook.com/profile.php?id=100054656460007",
  });

  console.log("🎉 הכל הועלה בהצלחה!");
}

main().catch(console.error);
