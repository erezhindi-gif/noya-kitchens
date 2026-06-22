"use client";
import { useState, useRef } from "react";

const CATEGORIES = [
  "מטבחים",
  "ארונות",
  "סלונים",
  "חדרי שינה",
  "חדרי ילדים",
  "ממ\"דים",
  "מסחרי",
];

export default function UploadPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setStatus("uploading");
    setProgress(0);
    setMessage("");

    const BATCH = 5;
    let done = 0;

    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const fd = new FormData();
      fd.append("category", category);
      batch.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/upload-images", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(`שגיאה: ${data.error}`);
        return;
      }

      done += batch.length;
      setProgress(Math.round((done / files.length) * 100));
    }

    setStatus("done");
    setMessage(`הועלו ${files.length} תמונות לקטגוריה "${category}" בהצלחה!`);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div dir="rtl" style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>העלאת תמונות — NOYA Kitchens</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>בחר קטגוריה ותמונות (אפשר לבחור הרבה בבת אחת)</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>קטגוריה:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: "100%", padding: "10px", fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>תמונות:</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ width: "100%", padding: "10px", fontSize: 16, borderRadius: 8, border: "1px solid #ccc", background: "#fafafa" }}
        />
        {files.length > 0 && (
          <p style={{ color: "#555", marginTop: 6 }}>נבחרו {files.length} תמונות</p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!files.length || status === "uploading"}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: 18,
          fontWeight: "bold",
          background: files.length && status !== "uploading" ? "#8B6F47" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: 10,
          cursor: files.length && status !== "uploading" ? "pointer" : "not-allowed",
        }}
      >
        {status === "uploading" ? `מעלה... ${progress}%` : "העלה תמונות"}
      </button>

      {status === "uploading" && (
        <div style={{ marginTop: 16, background: "#eee", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: 10, background: "#8B6F47", transition: "width 0.3s" }} />
        </div>
      )}

      {message && (
        <div style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 10,
          background: status === "done" ? "#d4edda" : "#f8d7da",
          color: status === "done" ? "#155724" : "#721c24",
          fontSize: 16,
        }}>
          {message}
        </div>
      )}

      <p style={{ marginTop: 40, color: "#999", fontSize: 13 }}>
        * התמונות מועלות ישירות ל-Sanity ומופיעות באתר תוך דקה.
      </p>
    </div>
  );
}
