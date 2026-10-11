// Saved items, trips and the traveler profile: titles, links and summaries.
import { L, getLang } from "./i18n";
import { addDays, validDate, fmtDate, nightsBetween } from "./util";
import { tripUrl, bookingUrl, runtime } from "./travel";
import { OB_QUESTIONS } from "./content";

export function itemKey(kind, d){
  if (kind === "place") return ("place:"+d.name).toLowerCase();
  if (kind === "hotel") return ("hotel:"+d.name+"|"+(d.city||"")).toLowerCase();
  return ("flight:"+[d.from,d.to,d.label||"",(d.airlines||[]).join(",")].join("|")).toLowerCase();
}
export function itemTitle(it){
  var d = it.data || {};
  if (it.kind === "flight") return (d.from||"") + " → " + (d.to||"");
  return d.name || "";
}
export function itemSub(it){
  var d = it.data || {};
  if (it.kind === "place") return [d.country, d.tagline].filter(Boolean).join(" · ");
  if (it.kind === "hotel") return [d.area || d.city, d.type, d.budget].filter(Boolean).join(" · ");
  return [d.label, (d.airlines||[]).join(", "), d.stops, d.depart].filter(Boolean).join(" · ");
}
export function itemLink(it){
  var d = it.data || {};
  if (it.kind === "flight" && d.from && d.to) return tripUrl(d.from, d.to, validDate(d.depart) ? d.depart : addDays(14), validDate(d.ret) ? d.ret : "", d.adults || 1);
  if (it.kind === "hotel") return bookingUrl(d.name + (d.city ? ", " + d.city : ""), validDate(d.checkin) ? d.checkin : addDays(14), validDate(d.checkout) ? d.checkout : addDays(17), d.adults || 2, d.rooms || 1);
  return "";
}
export function tripDates(tr){
  if (tr.start && tr.end) return fmtDate(tr.start) + " – " + fmtDate(tr.end) + " · " + (nightsBetween(tr.start, tr.end)+1) + L(" days"," দিন");
  if (tr.start) return fmtDate(tr.start);
  return "";
}
export function countLine(items){
  var c = { place:0, flight:0, hotel:0 };
  items.forEach(function(x){ c[x.kind] = (c[x.kind]||0) + 1; });
  var parts = [];
  if (c.place) parts.push("📍 "+c.place);
  if (c.flight) parts.push("✈️ "+c.flight);
  if (c.hotel) parts.push("🏨 "+c.hotel);
  return parts.join("   ") || L("Nothing added yet","এখনো কিছু যোগ হয়নি");
}
export function tripPrompt(tr, items){
  var parts = [L("Help me plan my trip","আমার ট্রিপ প্ল্যান করতে সাহায্য করুন") + ' "' + tr.name + '"' + (tr.dest ? L(" to "," — ") + tr.dest : "") + (tr.start ? L(" from "," ") + tr.start : "") + (tr.end ? L(" to "," থেকে ") + tr.end : "") + "."];
  if (items.length) parts.push(L("I've saved: ","আমি সেভ করেছি: ") + items.map(function(x){ return itemTitle(x) + (x.kind === "flight" ? " (" + L("flight","ফ্লাইট") + ")" : x.kind === "hotel" ? " (" + L("hotel","হোটেল") + ")" : ""); }).join(", ") + ".");
  parts.push(L("Make me a day-by-day plan.","দিনভিত্তিক প্ল্যান বানিয়ে দিন।"));
  return parts.join(" ");
}
export function optLabel(qid, v){
  var q = OB_QUESTIONS.filter(function(x){ return x.id === qid; })[0];
  if (!q || !q.options) return v;
  var o = q.options.filter(function(x){ return x.v === v; })[0];
  return o ? o[getLang()] : v;
}
export function profileLine(p){
  if (!p) return "";
  return "Traveler profile — name: "+(p.name||"")+"; travels from: "+(p.home||runtime.HOME_CITY)+
    "; style: "+(p.style||[]).join(", ")+"; loves: "+(p.likes||[]).join(", ")+"; usually travels with: "+(p.company||"")+
    "; budget per person: "+(p.budget||"")+"; likes to stay in: "+(p.stays||[]).join(", ")+"; usual trip length: "+(p.length||"")+
    (p.dream ? "; dream destination: "+p.dream : "")+
    ". Personalize every suggestion to this profile (budget, style, interests, who they travel with, where they stay) and greet them by first name now and then.\n";
}
