"use client";
// Remembers what brought the visitor to the site and counts visits and clicks on call / WhatsApp,
// so the marketing screen can show which channel brings clients. No cookies, no personal data.
import { useEffect } from "react";
import { channelOf, type Channel, type SiteEvent } from "@/lib/marketing/channels";
import { adsLead } from "@/lib/marketing/gads";

const KEY = "noya-ch";
const KEEP_DAYS = 60;
const PRIVATE = /^\/(admin|q|studio|oauth|api)(\/|$)/;

const OWNER = "noya-owner";
const isOwner = () => { try { return !!localStorage.getItem(OWNER); } catch { return false; } };

type Touch = { ch: Channel; at: number; landing: string };

/** The channel the visitor came from: the latest one that wasn't a direct visit, for 60 days. */
export function currentTouch(): Touch {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || "null") as Touch | null;
    if (t && Date.now() - t.at < KEEP_DAYS * 864e5) return t;
  } catch {}
  return { ch: "direct", at: Date.now(), landing: location.pathname };
}

export function track(e: SiteEvent) {
  const body = JSON.stringify({ e, ch: currentTouch().ch });
  try {
    if (navigator.sendBeacon?.("/api/t", new Blob([body], { type: "text/plain" }))) return;
  } catch {}
  fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
}

export default function SiteTracker() {
  useEffect(() => {
    // A browser that opened the admin is Erez's: his own visits to the site aren't counted.
    try { if (location.pathname.startsWith("/admin")) localStorage.setItem(OWNER, "1"); } catch {}
    if (PRIVATE.test(location.pathname) || isOwner()) return;
    const ch = channelOf(location.search, document.referrer, location.hostname);
    try {
      if (ch !== "direct" || !localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify({ ch, at: Date.now(), landing: location.pathname + location.search }));
    } catch {}
    let counted = false;
    try { counted = !!sessionStorage.getItem("noya-visit"); sessionStorage.setItem("noya-visit", "1"); } catch {}
    if (!counted) track("visit");

    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href") || "";
      if (href.startsWith("tel:")) { track("call"); adsLead(); }
      else if (/wa\.me|whatsapp\.com/.test(href)) { track("wa"); adsLead(); }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
