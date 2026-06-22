import { useState, useRef } from "react";
import { useClient } from "sanity";

const CATEGORIES = [
  "מטבחים",
  "ארונות",
  "סלונים",
  "חדרי שינה",
  "חדרי ילדים",
  'ממ"דים',
  "מסחרי",
];

export function BulkUploadTool() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setStatus("uploading");
    setProgress(0);
    setCurrent(0);
    setMessage("");

    try {
      const uploadedAssets = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrent(i + 1);
        const asset = await client.assets.upload("image", file, {
          filename: file.name,
          contentType: file.type,
        });
        uploadedAssets.push({
          _type: "image",
          _key: asset._id,
          asset: { _type: "reference", _ref: asset._id },
        });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Find existing project doc or create new one
      const existing = await client.fetch(
        `*[_type == "project" && category == $category][0]`,
        { category }
      );

      if (existing) {
        await client.patch(existing._id).setIfMissing({ images: [] }).append("images", uploadedAssets).commit();
        // Auto-publish
        await client.patch(`drafts.${existing._id}`).commit().catch(() => {});
      } else {
        const doc = await client.create({ _type: "project", category, title: category, images: uploadedAssets });
        await client.patch(`drafts.${doc._id}`).commit().catch(() => {});
      }

      setStatus("done");
      setMessage(`✓ הועלו ${files.length} תמונות לקטגוריה "${category}" בהצלחה!`);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      setStatus("error");
      setMessage(`שגיאה: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div dir="rtl" style={{ padding: "40px 32px", maxWidth: 560, fontFamily: "inherit" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>העלאת תמונות מרובות</h2>
      <p style={{ color: "#666", marginBottom: 32, fontSize: 14 }}>
        בחר קטגוריה ותמונות — אפשר לבחור כמה קבצים בו זמנית
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>קטגוריה:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", fontSize: 15, borderRadius: 8, border: "1px solid #d0d0d0", background: "#fafafa" }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>תמונות:</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ width: "100%", padding: "10px", fontSize: 14, borderRadius: 8, border: "1px solid #d0d0d0", background: "#fafafa" }}
        />
        {files.length > 0 && (
          <p style={{ color: "#555", marginTop: 6, fontSize: 13 }}>נבחרו {files.length} תמונות</p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!files.length || status === "uploading"}
        style={{
          width: "100%", padding: "13px", fontSize: 16, fontWeight: 700,
          background: files.length && status !== "uploading" ? "#8B6F47" : "#ccc",
          color: "white", border: "none", borderRadius: 10,
          cursor: files.length && status !== "uploading" ? "pointer" : "not-allowed",
        }}
      >
        {status === "uploading" ? `מעלה ${current} מתוך ${files.length}... ${progress}%` : "העלה תמונות"}
      </button>

      {status === "uploading" && (
        <div style={{ marginTop: 14, background: "#e8e8e8", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: 10, background: "#8B6F47", transition: "width 0.3s" }} />
        </div>
      )}

      {message && (
        <div style={{
          marginTop: 20, padding: 14, borderRadius: 10, fontSize: 15,
          background: status === "done" ? "#d4edda" : "#f8d7da",
          color: status === "done" ? "#155724" : "#721c24",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
