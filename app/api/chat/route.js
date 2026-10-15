// Tripo AI endpoint: POST /api/chat  { messages: [{ role: "user"|"assistant", content }] }  ->  { text }
// Uses OpenAI through lib/server/ai.js. API keys never reach the browser.

import { rateLimited } from "@/lib/server/ratelimit";
import { generateJSON, aiConfigured } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

const MAX_TURNS = 30;
const MAX_CHARS = 8000; // per message
const MAX_BODY_BYTES = 200_000;
const PER_MINUTE = 15; // requests per visitor per minute

const json = (status, body) => Response.json(body, { status });

export async function POST(req) {
  if (!aiConfigured()) return json(503, { error: "ai_not_configured" });
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) return json(413, { error: "too_large" });
  if (rateLimited("chat", req, PER_MINUTE)) return json(429, { error: "rate_limited" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }

  const messages = (Array.isArray(body && body.messages) ? body.messages.slice(-MAX_TURNS) : [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json(400, { error: "bad_messages" });

  try {
    const text = await generateJSON({ messages, temperature: 0.8, timeoutMs: 20000 });
    return json(200, { text });
  } catch (e) {
    if (e.code === "rate_limited") return json(429, { error: "rate_limited" });
    return json(502, { error: "upstream_error" });
  }
}

export function GET() {
  return json(405, { error: "method_not_allowed" });
}
