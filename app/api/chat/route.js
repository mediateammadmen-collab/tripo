// Tripo AI endpoint: POST /api/chat  { messages: [{ role: "user"|"assistant", content }] }  ->  { text }
// Talks to Google Gemini with the server-only GEMINI_API_KEY. The key never reaches the browser.

import { rateLimited } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

// Flash-Lite answers in a few seconds and is rarely overloaded, so it is the default.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// Used when the main model is busy (503), out of free quota (429) or too slow.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
const ATTEMPT_TIMEOUT_MS = 20_000; // give up on a stuck model instead of freezing the chat
const MAX_TURNS = 30;
const MAX_CHARS = 8000; // per message
const MAX_BODY_BYTES = 200_000;
const PER_MINUTE = 15; // requests per visitor per minute

const json = (status, body) => Response.json(body, { status });

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(503, { error: "ai_not_configured" });

  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return json(413, { error: "too_large" });
  }
  if (rateLimited("chat", req, PER_MINUTE)) return json(429, { error: "rate_limited" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }

  const messages = Array.isArray(body && body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const contents = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_CHARS) }],
    }));
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return json(400, { error: "bad_messages" });
  }

  const payload = JSON.stringify({
    contents,
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
  });
  const models = FALLBACK_MODEL && FALLBACK_MODEL !== MODEL ? [MODEL, FALLBACK_MODEL] : [MODEL];

  let res = null;
  for (const model of models) {
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: payload,
          cache: "no-store",
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        }
      );
    } catch (e) {
      console.warn(`Gemini ${model} ${e && e.name === "TimeoutError" ? "timed out" : "unreachable"}, trying next model`);
      res = null;
      continue;
    }
    if (res.status !== 503 && res.status !== 429) break;
    console.warn(`Gemini ${model} returned ${res.status}, trying next model`);
  }
  if (!res) return json(502, { error: "upstream_unreachable" });

  if (res.status === 429) return json(429, { error: "rate_limited" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini error", res.status, detail.slice(0, 500));
    return json(502, { error: "upstream_error", status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  return json(200, { text });
}

export function GET() {
  return json(405, { error: "method_not_allowed" });
}
