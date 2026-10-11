// POST /api/receipt  { mime, data (base64) }  ->  { receipt: { type, title, vendor, confirmation, start_date, … } }
// Reads a photo or PDF of a ticket, hotel voucher or receipt with Gemini. The file is not stored.

import { rateLimited } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
const MAX_BASE64 = 6_000_000; // ~4.4 MB file
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
const KINDS = ["flight", "hotel", "train", "bus", "car", "activity", "restaurant", "other"];

const PROMPT =
  "This file is a travel booking: a flight ticket, hotel voucher, train or bus ticket, tour or activity booking, or a payment receipt.\n" +
  "Read it and reply with ONE JSON object only:\n" +
  '{"is_booking": boolean, "type": "flight"|"hotel"|"train"|"bus"|"car"|"activity"|"restaurant"|"other", "title": string, "vendor": string, "confirmation": string, ' +
  '"start_date": "YYYY-MM-DD"|null, "end_date": "YYYY-MM-DD"|null, "from": string, "to": string, "amount": string, "currency": string, "notes": string}\n' +
  "- title: a short label such as \"Dhaka → Bangkok flight\" or the hotel name.\n" +
  "- vendor: airline, hotel or company. confirmation: booking / PNR / reference number.\n" +
  "- start_date: departure or check-in date. end_date: return or check-out date.\n" +
  "- from / to: cities or airports for transport, otherwise empty strings.\n" +
  "- amount: total paid as digits only (e.g. \"18500\"), currency as a 3-letter code.\n" +
  "- notes: at most 20 words of other useful details (flight number, departure time, room type, passenger names).\n" +
  "Only write what is actually printed in the file. Use empty strings or null for anything missing. " +
  "If the file is not a travel booking or receipt, set is_booking to false.";

const json = (status, body) => Response.json(body, { status });
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : typeof v === "number" ? String(v) : "");
const date = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(503, { error: "ai_not_configured" });
  if (rateLimited("receipt", req, 6)) return json(429, { error: "rate_limited" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const mime = String((body && body.mime) || "").toLowerCase();
  const data = String((body && body.data) || "");
  if (!TYPES.includes(mime)) return json(415, { error: "unsupported_type" });
  if (!data || data.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 2000))) return json(413, { error: "bad_file" });

  const payload = JSON.stringify({
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data } }, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  });

  let res = null;
  for (const model of MODEL === FALLBACK_MODEL ? [MODEL] : [MODEL, FALLBACK_MODEL]) {
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      res = null;
      continue;
    }
    if (res.status !== 503 && res.status !== 429) break;
  }
  if (!res) return json(502, { error: "upstream_unreachable" });
  if (res.status === 429) return json(429, { error: "rate_limited" });
  if (!res.ok) {
    console.error("Gemini receipt error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return json(502, { error: "upstream_error" });
  }

  const out = await res.json().catch(() => ({}));
  const text = (out?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
  let r;
  try {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    r = JSON.parse(a >= 0 && b > a ? text.slice(a, b + 1) : text);
  } catch {
    return json(502, { error: "unreadable" });
  }
  if (!r || r.is_booking === false) return json(422, { error: "not_a_booking" });

  return json(200, {
    receipt: {
      type: KINDS.includes(r.type) ? r.type : "other",
      title: str(r.title, 80),
      vendor: str(r.vendor, 60),
      confirmation: str(r.confirmation, 40),
      start_date: date(r.start_date),
      end_date: date(r.end_date),
      from: str(r.from, 60),
      to: str(r.to, 60),
      amount: str(r.amount, 20),
      currency: str(r.currency, 6).toUpperCase(),
      notes: str(r.notes, 200),
    },
  });
}
