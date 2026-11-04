"use client";

export default function PrintButton() {
  return <button type="button" className="sh-print" onClick={() => window.print()}>🖨️ הדפסה או שמירה כ-PDF</button>;
}
