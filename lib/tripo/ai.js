// Talking to the AI: the prompt Tripo sends, and reading the reply.
import { L } from "./i18n";
import { ymd } from "./util";
import { runtime } from "./travel";
import { profileLine } from "./items";

export const HUMAN_RE = /\b(human|real (person|agent|human)|live agent|talk to (someone|a person|an agent|agent)|speak to (someone|a person|an agent)|customer (care|service|support)|call me|contact (you|agent))\b|মানুষের সাথে|এজেন্টের সাথে|কাস্টমার কেয়ার/i;
export const FLIGHT_RE = /flight|fly|air ?ticket|plane|ফ্লাইট|বিমান|টিকিট/i;
export const HOTEL_RE = /hotel|stay|resort|room|hostel|হোটেল|থাকার|রিসোর্ট/i;


export function extractReply(raw){
  var m = String(raw||"").match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return "";
  var body = m[1].replace(/\\u[0-9a-fA-F]{0,3}$/,"").replace(/\\$/,"");
  try { return JSON.parse('"'+body+'"'); } catch(e){ return body.replace(/\\n/g,"\n").replace(/\\"/g,'"'); }
}

export function buildTurns(chatHistory, profile){
  var persona = L(
    "You are Tripo, a warm, upbeat travel buddy inside a travel app used by people in Bangladesh and around the world. You help with destinations, trip plans, flights, places to stay, food and things to do. Talk like a kind friend who loves travel: cheerful, encouraging, simple words, short sentences, no jargon. Use the traveler's first name now and then if you know it.",
    "আপনি Tripo, বাংলাদেশ ও বিশ্বের ভ্রমণকারীদের জন্য একটি বন্ধুসুলভ ভ্রমণ সহায়ক। সহজ ভাষায়, ছোট বাক্যে, বন্ধুর মতো কথা বলুন।"
  );
  var format =
    profileLine(profile) + "Today is "+ymd(new Date())+". Assume the traveler starts from "+runtime.HOME_CITY+" ("+runtime.HOME_IATA+") unless they say otherwise.\n"+
    "How to help:\n"+
    "- When the traveler asks for places, ideas, where to go, things to do, or a plan: give your suggestions RIGHT AWAY in this reply. Do not ask questions first; make sensible assumptions (from their profile, or a relaxed mid-range trip) and say them briefly. You may end with one short optional question to fine-tune.\n"+
    "- When the traveler is just chatting (hello, thanks, how are you, a joke) or asks a general question (weather, visas, packing, culture), answer warmly and helpfully WITHOUT suggesting places: places must be [] and flight, hotel and itinerary null. Don't push trips they didn't ask for.\n"+
    "- If something is unclear, still give your best helpful answer instead of only asking questions.\n"+
    "Reply with ONE JSON object only, no other text, with these keys in this order:\n"+
    '{"reply": string, "places": array, "flight": object|null, "hotel": object|null, "itinerary": array|null, "destination": string|null, "handoff": boolean, "suggestions": array}\n'+
    "- reply: friendly and easy to read, 1-2 short paragraphs, about 50 words (up to 90 for a plan). You may use **bold** and lines starting with \"- \". At most one emoji. Don't list the items that the cards below will show.\n"+
    "- places: destinations or sights you recommend, each {\"name\",\"country\",\"scene\",\"tagline\",\"best_time\"}. Give 5-6 when the traveler asks for ideas or more places, 1-3 when they ask about a specific trip, [] when they didn't ask for places. scene is one of: beach, mountain, city, temple, desert, forest, island, oldtown, river, snow. tagline max 8 words. best_time like \"Nov-Feb\".\n"+
    "- flight: only when they ask about flights or getting somewhere by air, or ask for a full trip: {\"from_city\",\"from_iata\",\"to_city\",\"to_iata\",\"depart\",\"return\",\"adults\",\"tip\",\"options\"}. 3-letter IATA codes. depart/return YYYY-MM-DD only if the traveler gave dates, else null. options: 4 different ways to fly this route, each {\"label\",\"airlines\",\"stops\",\"duration\",\"why\"}: label like \"Fastest\", \"Best value\", \"Most comfortable\", \"Budget pick\"; airlines: array of 1-2 airlines that really fly it; stops: \"Direct\" or \"1 stop via <city>\"; duration: typical total time like \"~2h 40m\"; why max 10 words. tip: one practical line. Otherwise null.\n"+
    "- hotel: only when they ask about hotels or where to stay, or ask for a full trip: {\"city\",\"checkin\",\"checkout\",\"adults\",\"rooms\",\"areas\",\"options\"}. areas: 2-3 {\"name\",\"why\"} (why max 8 words). options: 6 real, well-known hotels, guesthouses or resorts in that city across budgets, each {\"name\",\"area\",\"type\",\"budget\",\"why\"}; type like \"4★ hotel\", \"Guesthouse\", \"Resort\"; budget one of \"$\", \"$$\", \"$$$\"; why max 10 words. Only name properties you are confident exist. Dates only if given, else null. Otherwise null.\n"+
    "- itinerary: only when they ask for a plan: up to 7 {\"day\",\"title\",\"plan\",\"places\"}, plan max 20 words. places: 2-4 real, specific places visited that day, in visiting order, each written as its usual English name that a map search would find (e.g. \"Wat Pho\", \"Lalbagh Fort\"); no generic words like \"hotel\" or \"local market\". Otherwise null.\n"+
    "- destination: when you give an itinerary or hotel, the main city or region in English (e.g. \"Bangkok\"), else null.\n"+
    "- handoff: true if they ask for a human or agent, want a custom package, visa help, a group booking, have a booking problem, or seem stuck. Otherwise false.\n"+
    "- suggestions: 2-4 short follow-ups the traveler might tap next, max 5 words each, written as the traveler.\n"+
    "When the traveler asks for more, give DIFFERENT items from those already shown (see the [Shown: ...] notes in your earlier replies).\n"+
    "Never make up prices, flight numbers, exact timings or availability. Live prices are on Trip.com (flights) and Booking.com (hotels).\n"+
    L("Write everything in English.", "Write reply, tagline, best_time, tip, why, title, plan and suggestions in Bangla. Keep place names (name, country, city, areas, itinerary places, destination), hotel names, airline names and codes in English.");
  var hist = chatHistory.slice(-12).map(function(m){ return { role:m.role, content:m.content }; });
  while (hist.length && hist[0].role !== "user") hist.shift();
  var turns = [{ role:"user", content: persona + "\n\n" + format }, { role:"assistant", content: L("Got it!","বুঝেছি!") }].concat(hist);
  var last = turns[turns.length-1];
  last.content = last.content + "\n\n(Answer with the JSON object only.)";
  return turns;
}

export function shownNote(data){
  var parts = [];
  if (Array.isArray(data.places) && data.places.length) parts.push("places: " + data.places.map(function(p){ return p && p.name; }).filter(Boolean).join(", "));
  if (data.flight && data.flight.options) parts.push("flight options " + (data.flight.from_iata||"") + "-" + (data.flight.to_iata||"") + ": " + data.flight.options.map(function(o){ return o && ((o.label||"") + " " + [].concat(o.airlines||[]).join("/")); }).filter(Boolean).join("; "));
  if (data.hotel && data.hotel.options) parts.push("hotels in " + (data.hotel.city||"") + ": " + data.hotel.options.map(function(o){ return o && o.name; }).filter(Boolean).join(", "));
  return parts.length ? "\n[Shown: " + parts.join(" | ") + "]" : "";
}

// Sends the conversation to /api/chat and returns the parsed JSON answer.
// Errors carry a code: "rate_limited", "unavailable" or "invalid_json" (with .text).
export async function askAI(turns){
  function err(code, message){ var e = new Error(message || code); e.code = code; return e; }
  var res;
  try {
    res = await fetch("/api/chat", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ messages: turns }) });
  } catch(e){ throw err("unavailable", "network"); }
  if (res.status === 429) throw err("rate_limited");
  if (!res.ok) throw err("unavailable", "HTTP " + res.status);
  var data = await res.json().catch(function(){ return {}; });
  var text = String(data.text || "");
  var s = text.replace(/```json|```/g, "").trim();
  var a = s.indexOf("{"), b = s.lastIndexOf("}");
  try { return JSON.parse(a >= 0 && b > a ? s.slice(a, b+1) : s); }
  catch(e){ var x = err("invalid_json"); x.text = text; throw x; }
}
