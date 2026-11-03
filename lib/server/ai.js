// One place for every text/JSON request Tripo makes to the AI (chat, city guides, receipts).
//
// AI_PROVIDER picks who answers: "gemini" (the default) or "openai". Only that one is ever used —
// there is no fallback to the other, so OpenAI is never billed while Tripo is on Gemini.
// (Tripo v1.0, git tag v1.0-openai, ran on OpenAI; it was switched to Gemini to cut costs.)
//
// generateJSON({ messages, file, temperature, timeoutMs }) -> string (the model's JSON text)
//   messages: [{ role: "user"|"assistant", content }]
//   file:     optional { mime, data (base64) } attached to the last user message (photos, PDFs)

export const PROVIDER = () => ((process.env.AI_PROVIDER || "").trim().toLowerCase() === "openai" ? "openai" : "gemini");

const OPENAI_KEY = () => (process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || "").trim();
const GEMINI_KEY = () => (process.env.GEMINI_API_KEY || "").trim();
const KEY = () => (PROVIDER() === "openai" ? OPENAI_KEY() : GEMINI_KEY());

// The main model, then one backup tried if it is overloaded or fails.
const MODELS = () => {
  const [main, backup] =
    PROVIDER() === "openai"
      ? [process.env.OPENAI_MODEL || "gpt-5.4-mini", process.env.OPENAI_BACKUP_MODEL || "gpt-4.1-mini"]
      : [process.env.GEMINI_MODEL || "gemini-flash-lite-latest", process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest"];
  return main === backup ? [main] : [main, backup];
};

export class AIError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // rate_limited | unavailable | ai_not_configured
  }
}

export function aiConfigured() {
  return !!KEY();
}

async function post(url, headers, body, label, timeoutMs) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new AIError("unavailable", label + " " + (e && e.name));
  }
  if (res.status === 429) throw new AIError("rate_limited", label + " 429");
  if (!res.ok) {
    console.error("AI error", label, res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new AIError("unavailable", label + " " + res.status);
  }
  return res.json().catch(() => ({}));
}

async function openai(model, { messages, file, temperature, timeoutMs }) {
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

  const data = await post("https://api.openai.com/v1/chat/completions", { Authorization: "Bearer " + OPENAI_KEY() }, body, model, timeoutMs);
  return String(data?.choices?.[0]?.message?.content || "");
}

async function gemini(model, { messages, file, temperature, timeoutMs }) {
  const contents = messages.map((m, i) => {
    const parts = [{ text: m.content }];
    if (file && i === messages.length - 1) parts.unshift({ inlineData: { mimeType: file.mime, data: file.data } });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": GEMINI_KEY() },
    { contents, generationConfig: { responseMimeType: "application/json", temperature } },
    model,
    timeoutMs
  );
  return (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
}

export async function generateJSON({ messages, file = null, temperature = 0.8, timeoutMs = 25000 }) {
  if (!KEY()) throw new AIError("ai_not_configured");
  const ask = PROVIDER() === "openai" ? openai : gemini;
  let lastErr = null;
  for (const model of MODELS()) {
    try {
      const text = await ask(model, { messages, file, temperature, timeoutMs });
      if (text) return text;
      lastErr = new AIError("unavailable", model + " empty");
    } catch (e) {
      lastErr = e instanceof AIError ? e : new AIError("unavailable");
      // Out of credit or a bad key won't be fixed by another model.
      if (/ 40[013]$/.test(lastErr.message)) break;
      console.warn(`${model} failed (${lastErr.message}); trying the backup model`);
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
