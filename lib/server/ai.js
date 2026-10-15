// One place for every text/JSON request Tripo makes to an AI model (chat, city guides, receipts).
//
// Providers are tried in order: OpenAI first (if a key is set), then Google Gemini as a backup —
// or the other way round with AI_PROVIDER=gemini. If one is busy, slow or out of credit, the next is used.
//
// generateJSON({ messages, file, temperature, timeoutMs }) -> string (the model's JSON text)
//   messages: [{ role: "user"|"assistant", content }]
//   file:     optional { mime, data (base64) } attached to the last user message (photos, PDFs)

const OPENAI_KEY = () => (process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || "").trim();
const GEMINI_KEY = () => (process.env.GEMINI_API_KEY || "").trim();
const OPENAI_MODEL = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";
const GEMINI_MODELS = () => {
  const main = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const backup = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
  return main === backup ? [main] : [main, backup];
};

export class AIError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // rate_limited | unavailable | ai_not_configured
  }
}

export function aiConfigured() {
  return !!(OPENAI_KEY() || GEMINI_KEY());
}

function providers(prefer) {
  const list = [];
  if (OPENAI_KEY()) list.push("openai");
  if (GEMINI_KEY()) list.push("gemini");
  const first = prefer || (process.env.AI_PROVIDER || "").toLowerCase();
  if (first === "gemini") list.sort((a) => (a === "gemini" ? -1 : 1));
  return list;
}

/* ---------------- OpenAI ---------------- */
async function openai({ messages, file, temperature, timeoutMs }) {
  const model = OPENAI_MODEL();
  const msgs = messages.map((m, i) => {
    const last = i === messages.length - 1;
    if (!file || !last) return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
    const attachment =
      file.mime === "application/pdf"
        ? { type: "file", file: { filename: "booking.pdf", file_data: "data:application/pdf;base64," + file.data } }
        : { type: "image_url", image_url: { url: "data:" + file.mime + ";base64," + file.data, detail: "high" } };
    return { role: "user", content: [attachment, { type: "text", text: m.content }] };
  });
  const body = { model, messages: msgs, response_format: { type: "json_object" } };
  // GPT-5-family models think before answering; Tripo needs quick replies, so keep that to a minimum.
  if (/^(gpt-5|o\d)/.test(model)) body.reasoning_effort = "none";
  else body.temperature = temperature;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + OPENAI_KEY(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429) throw new AIError("rate_limited", "openai 429");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("OpenAI error", res.status, detail.slice(0, 300));
    throw new AIError("unavailable", "openai " + res.status);
  }
  const data = await res.json();
  return String((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "");
}

/* ---------------- Gemini ---------------- */
async function gemini({ messages, file, temperature, timeoutMs }) {
  const contents = messages.map((m, i) => {
    const parts = [{ text: m.content }];
    if (file && i === messages.length - 1) parts.unshift({ inlineData: { mimeType: file.mime, data: file.data } });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const payload = JSON.stringify({ contents, generationConfig: { responseMimeType: "application/json", temperature } });
  let last = null;
  for (const model of GEMINI_MODELS()) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY() },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      last = new AIError("unavailable", "gemini " + model + " timeout");
      continue;
    }
    if (res.status === 503 || res.status === 429) {
      last = new AIError(res.status === 429 ? "rate_limited" : "unavailable", "gemini " + res.status);
      continue;
    }
    if (!res.ok) {
      console.error("Gemini error", res.status, (await res.text().catch(() => "")).slice(0, 300));
      throw new AIError("unavailable", "gemini " + res.status);
    }
    const data = await res.json().catch(() => ({}));
    return (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
  }
  throw last || new AIError("unavailable");
}

// prefer: "gemini" or "openai" to try that provider first for this request (e.g. long lists, where speed matters most).
export async function generateJSON({ messages, file = null, temperature = 0.8, timeoutMs = 25000, prefer = "" }) {
  const order = providers(prefer);
  if (!order.length) throw new AIError("ai_not_configured");
  let lastErr = null;
  for (const p of order) {
    try {
      const text = await (p === "openai" ? openai : gemini)({ messages, file, temperature, timeoutMs });
      if (text) return text;
      lastErr = new AIError("unavailable", p + " empty");
    } catch (e) {
      lastErr = e instanceof AIError ? e : new AIError("unavailable", p + " " + (e && e.name));
      console.warn(`AI provider ${p} failed (${lastErr.message}); trying the next one`);
    }
  }
  throw lastErr || new AIError("unavailable");
}

// Pulls the JSON object out of a model reply (tolerates stray text or code fences).
export function parseJSON(text) {
  const s = String(text || "").replace(/```json|```/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? s.slice(a, b + 1) : s);
}
