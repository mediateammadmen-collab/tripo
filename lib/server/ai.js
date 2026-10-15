// One place for every text/JSON request Tripo makes to the AI (chat, city guides, receipts).
// Tripo uses OpenAI (ChatGPT models) for everything.
//
// generateJSON({ messages, file, temperature, timeoutMs }) -> string (the model's JSON text)
//   messages: [{ role: "user"|"assistant", content }]
//   file:     optional { mime, data (base64) } attached to the last user message (photos, PDFs)

const KEY = () => (process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || "").trim();
const MODEL = () => process.env.OPENAI_MODEL || "gpt-5.4-mini";
// Used once more if the main model is overloaded or fails.
const BACKUP_MODEL = () => process.env.OPENAI_BACKUP_MODEL || "gpt-4.1-mini";

export class AIError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // rate_limited | unavailable | ai_not_configured
  }
}

export function aiConfigured() {
  return !!KEY();
}

async function call(model, { messages, file, temperature, timeoutMs }) {
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

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new AIError("unavailable", model + " " + (e && e.name));
  }
  if (res.status === 429) throw new AIError("rate_limited", model + " 429");
  if (!res.ok) {
    console.error("OpenAI error", model, res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new AIError("unavailable", model + " " + res.status);
  }
  const data = await res.json();
  return String((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "");
}

export async function generateJSON({ messages, file = null, temperature = 0.8, timeoutMs = 25000 }) {
  if (!KEY()) throw new AIError("ai_not_configured");
  const models = MODEL() === BACKUP_MODEL() ? [MODEL()] : [MODEL(), BACKUP_MODEL()];
  let lastErr = null;
  for (const model of models) {
    try {
      const text = await call(model, { messages, file, temperature, timeoutMs });
      if (text) return text;
      lastErr = new AIError("unavailable", model + " empty");
    } catch (e) {
      lastErr = e instanceof AIError ? e : new AIError("unavailable");
      // Out of credit or a bad key won't be fixed by another model.
      if (/ 40[13]$/.test(lastErr.message)) break;
      console.warn(`OpenAI ${model} failed (${lastErr.message}); trying the backup model`);
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
