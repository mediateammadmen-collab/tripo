// POST /api/voice/session  { lang, profile, context }  ->  { value, model, expiresAt }
// Creates a short-lived key for one live voice conversation with OpenAI's Realtime API.
// The browser uses it to connect directly (WebRTC); the real API key never leaves the server.

import { rateLimited } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

const KEY = () => (process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || "").trim();
const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";
const VOICE = process.env.OPENAI_VOICE || "marin";
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

// What Tripo can put on the screen while it talks. The browser draws these as the usual cards and map pins.
const PLACE = {
  type: "object",
  properties: {
    name: { type: "string", description: "Usual English name a map search would find" },
    city: { type: "string", description: "Town or city the place is in; always set for restaurants, hotels and sights in a city" },
    country: { type: "string" },
    scene: { type: "string", enum: ["beach", "mountain", "city", "temple", "desert", "forest", "island", "oldtown", "river", "snow"] },
    tagline: { type: "string", description: "Max 8 words, in the traveler's language" },
    best_time: { type: "string", description: 'Like "Nov-Feb"' },
  },
  required: ["name", "country"],
};
const TOOLS = [
  {
    type: "function",
    name: "show_places",
    description: "Show destinations or sights as cards with photos and map pins. Use whenever you recommend places.",
    parameters: { type: "object", properties: { places: { type: "array", items: PLACE, minItems: 1, maxItems: 6 } }, required: ["places"] },
  },
  {
    type: "function",
    name: "show_itinerary",
    description: "Show a day-by-day trip plan with each day's stops on the map. Use whenever you give a plan.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Main city or region, in English" },
        days: {
          type: "array",
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              day: { type: "integer" },
              title: { type: "string" },
              plan: { type: "string", description: "Max 20 words" },
              places: { type: "array", items: { type: "string" }, description: "2-4 real, specific places visited that day, in English" },
            },
            required: ["day", "title", "plan", "places"],
          },
        },
      },
      required: ["destination", "days"],
    },
  },
  {
    type: "function",
    name: "show_flights",
    description: "Show a flight search card with ways to fly a route and a link to live prices.",
    parameters: {
      type: "object",
      properties: {
        from_city: { type: "string" }, from_iata: { type: "string" }, to_city: { type: "string" }, to_iata: { type: "string" },
        depart: { type: "string", description: "YYYY-MM-DD only if the traveler gave a date" },
        return: { type: "string", description: "YYYY-MM-DD only if given" },
        adults: { type: "integer" },
        tip: { type: "string" },
        options: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            properties: { label: { type: "string" }, airlines: { type: "array", items: { type: "string" } }, stops: { type: "string" }, duration: { type: "string" }, why: { type: "string" } },
            required: ["label", "airlines", "stops"],
          },
        },
      },
      required: ["to_city"],
    },
  },
  {
    type: "function",
    name: "show_hotels",
    description: "Show places to stay in a city as cards, with good areas and a link to live prices.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
        checkin: { type: "string" }, checkout: { type: "string" },
        adults: { type: "integer" }, rooms: { type: "integer" },
        areas: { type: "array", maxItems: 3, items: { type: "object", properties: { name: { type: "string" }, why: { type: "string" } }, required: ["name"] } },
        options: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            properties: { name: { type: "string" }, area: { type: "string" }, type: { type: "string" }, budget: { type: "string", enum: ["$", "$$", "$$$"] }, why: { type: "string" } },
            required: ["name"],
          },
        },
      },
      required: ["city"],
    },
  },
  {
    type: "function",
    name: "talk_to_human",
    description: "Offer a real travel expert from the Tripo team (custom packages, visas, group bookings, booking problems, or if asked).",
    parameters: { type: "object", properties: {} },
  },
];

function instructions({ lang, profile, context, homeCity }) {
  const bn = lang === "bn";
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You are Tripo, a warm, upbeat travel buddy in a travel app used by people in Bangladesh and around the world. You are talking out loud with a traveler.",
    "Sound like a kind friend who loves travel: cheerful, encouraging, natural. Keep each spoken answer short — two or three sentences — and let the traveler lead.",
    bn
      ? "Speak in Bangla (Bengali) with a natural Bangladeshi accent. Keep place, hotel and airline names in their usual English form. If the traveler switches to English, follow them."
      : "Speak in English. If the traveler speaks Bangla (Bengali), switch to Bangla.",
    "When the traveler asks for places, ideas, where to go or things to do: suggest them right away — don't ask questions first; make sensible assumptions and mention them briefly. Call show_places with the places, then just name two or three highlights out loud and say you've put them on their screen. Never read a long list aloud.",
    "When you give a trip plan, call show_itinerary. For flights call show_flights, for places to stay call show_hotels. Speak a short summary, not every detail.",
    "When the traveler is just chatting or asks a general question (visas, weather, packing), answer warmly without showing places.",
    "Never make up prices, flight numbers, exact timings or availability; live prices are on Trip.com (flights) and Booking.com (hotels). For visa rules, say they should confirm with the official embassy site.",
    "Only name hotels and places you are confident really exist.",
    "Today is " + today + ". Assume the traveler starts from " + (homeCity || "Dhaka") + " unless they say otherwise.",
    profile ? "About this traveler: " + profile : "",
    context ? "Recent chat with this traveler, for context:\n" + context : "",
    "Begin by greeting the traveler briefly and asking where they'd like to go.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req) {
  if (!KEY()) return Response.json({ error: "voice_not_configured" }, { status: 503 });
  if (rateLimited("voice", req, 4)) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body = {};
  try {
    body = await req.json();
  } catch {}
  const lang = body.lang === "bn" ? "bn" : "en";
  const session = {
    type: "realtime",
    model: MODEL,
    instructions: instructions({ lang, profile: str(body.profile, 900), context: str(body.context, 2500), homeCity: str(body.homeCity, 60) }),
    output_modalities: ["audio"],
    audio: {
      input: {
        transcription: { model: TRANSCRIBE_MODEL, ...(lang === "bn" ? { language: "bn" } : {}) },
        turn_detection: { type: "semantic_vad" },
        noise_reduction: { type: "near_field" },
      },
      output: { voice: VOICE },
    },
    tools: TOOLS,
    tool_choice: "auto",
  };

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY(), "Content-Type": "application/json" },
      body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.value) {
    console.error("Realtime session error", res.status, JSON.stringify(data).slice(0, 400));
    return Response.json({ error: res.status === 429 ? "rate_limited" : "unavailable" }, { status: res.status === 429 ? 429 : 502 });
  }
  return Response.json({ value: data.value, model: MODEL, expiresAt: data.expires_at || null });
}
