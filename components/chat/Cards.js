"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Photo from "@/components/ui/Photo";
import { useTripo } from "@/lib/tripo/store";
import { L } from "@/lib/tripo/i18n";
import { addDays, validDate, ymd, nightsBetween } from "@/lib/tripo/util";
import { AIRPORTS, cityToIata, tripUrl, tripRouteUrl, bookingUrl, runtime } from "@/lib/tripo/travel";
import { itemKey } from "@/lib/tripo/items";
import { placeQuery, placeKey } from "@/lib/tripo/places";

/* A real photo of a place (see components/ui/Photo.js). */
export function PlacePhoto({ info, q }) {
  return <Photo info={info} q={q} />;
}

// Opens the details panel for a place and points the map at it.
export function showPlace(kind, data, dest) {
  const query = placeQuery(kind, data, dest);
  const key = placeKey(query);
  const s = useTripo.getState();
  s.resolvePlaces([query]);
  s.setMapFocus(key);
  s.openPlace({ key, kind, name: data.name, data, query });
}

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

/* Bookmark button. `data` may be an object or a function returning the latest values. */
export function SaveButton({ kind, data, onImage }) {
  const d = typeof data === "function" ? data() : data;
  const key = itemKey(kind, d);
  const on = useTripo((s) => s.saved.some((x) => x.key === key));
  const toggleSave = useTripo((s) => s.toggleSave);
  return (
    <button
      type="button"
      className={"save-btn" + (onImage ? " on-img" : "") + (on ? " on" : "")}
      aria-pressed={on}
      aria-label={L("Save", "সেভ")}
      onClick={(e) => { e.stopPropagation(); toggleSave(kind, typeof data === "function" ? data() : data); }}
    >
      <Icon name="bookmark" size={16} />
    </button>
  );
}

/* "More like these" button: asks Tripo a follow-up, once. */
export function MoreButton({ label, prompt }) {
  const [used, setUsed] = useState(false);
  const send = useTripo((s) => s.sendChatMessage);
  return (
    <button type="button" className="more-btn" disabled={used} onClick={() => { setUsed(true); send(prompt); }}>
      {label}
    </button>
  );
}

/* ---------------- places ---------------- */
function PlaceCard({ p, solo }) {
  const send = useTripo((s) => s.sendChatMessage);
  const name = p.name || "";
  const data = { name, city: p.city || "", country: p.country || "", scene: p.scene || "", tagline: p.tagline || "", best_time: p.best_time || "" };
  const key = placeKey(placeQuery("place", p));
  const info = useTripo((s) => s.placeInfo[key]);
  const open = () => showPlace("place", p);
  return (
    <div className={"place-card" + (solo ? " solo" : "")} data-place={key}>
      <div className="place-media" role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}>
        <PlacePhoto info={info} q={placeQuery("place", p)} />
        <SaveButton kind="place" data={data} onImage />
        <div className="ov">
          <div className="place-name">{name}</div>
          {p.city || p.country ? <div className="place-country">{[p.city, p.country].filter(Boolean).join(", ")}</div> : null}
        </div>
      </div>
      <div className="place-body">
        {p.tagline ? <div className="place-tag">{p.tagline}</div> : null}
        {p.best_time ? <span className="place-best">{L("Best time: ", "সেরা সময়: ") + p.best_time}</span> : null}
        <div className="place-actions">
          <button type="button" className="pa-btn y" onClick={() => send(L("Find me flights to ", "ফ্লাইট খুঁজে দিন: ") + name)}>{L("✈️ Flights", "✈️ ফ্লাইট")}</button>
          <button type="button" className="pa-btn" onClick={() => send(L("Show me hotels in ", "হোটেল দেখান: ") + name)}>{L("🏨 Hotels", "🏨 হোটেল")}</button>
          <button type="button" className="pa-btn" onClick={() => send(L("Plan 3 easy days in ", "৩ দিনের সহজ প্ল্যান: ") + name)}>{L("🗓 Plan", "🗓 প্ল্যান")}</button>
        </div>
      </div>
    </div>
  );
}

export function Places({ places }) {
  const list = (places || []).filter((p) => p && p.name).slice(0, 8);
  if (!list.length) return null;
  return (
    <div className="rich">
      <div className="place-row">
        {list.map((p, i) => <PlaceCard key={p.name + i} p={p} solo={list.length === 1} />)}
      </div>
      {list.length > 1 && (
        <div className="swipe-hint">{L("Swipe to see all " + list.length + " →", "সবগুলো দেখতে সোয়াইপ করুন (" + list.length + ") →")}</div>
      )}
      <MoreButton label={L("More places like these", "এরকম আরও জায়গা")} prompt={L("Show me more places like these", "এরকম আরও জায়গা দেখান")} />
    </div>
  );
}

/* ---------------- day-by-day plan ---------------- */
export function ItineraryDays({ items, style }) {
  return (
    <div className="itin" style={style}>
      {items.map((d, i) => (
        <div className="itin-day" key={i}>
          <div className="itin-n">{L("D", "দিন ") + (d.day || i + 1)}</div>
          <div>
            <div className="itin-t">{d.title || ""}</div>
            <div className="itin-p">{d.plan || ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Itinerary({ items, dest }) {
  const saveAsTrip = useTripo((s) => s.saveItineraryAsTrip);
  const list = (items || []).filter((d) => d && (d.title || d.plan)).slice(0, 10);
  if (!list.length) return null;
  return (
    <div className="rich">
      <div className="itin">
        {list.map((d, i) => (
          <div className="itin-day" key={i}>
            <div className="itin-n">{L("D", "দিন ") + (d.day || i + 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="itin-t">{d.title || ""}</div>
              <div className="itin-p">{d.plan || ""}</div>
              {Array.isArray(d.places) && d.places.length > 0 && (
                <div className="itin-stops">
                  {d.places.filter((x) => typeof x === "string" && x.trim()).slice(0, 5).map((name) => (
                    <button key={name} type="button" className="itin-stop" onClick={() => showPlace("stop", { name: name.trim(), context: dest || "" }, dest)}>📍 {name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="book-cta" style={{ margin: "10px 0 4px", width: "100%" }} onClick={() => saveAsTrip(list, dest)}>
          <Icon name="suitcase" size={18} /> {L("Save this plan as a trip", "এই প্ল্যান ট্রিপ হিসেবে সেভ করুন")}
        </button>
      </div>
    </div>
  );
}

/* ---------------- flights ---------------- */
export function FlightCard({ f }) {
  f = f || {};
  const [v, setV] = useState(() => {
    const depart = validDate(f.depart) ? f.depart : addDays(14);
    return {
      from: cityToIata(f.from_iata) || cityToIata(f.from_city) || runtime.HOME_IATA,
      to: cityToIata(f.to_iata) || cityToIata(f.to_city) || "",
      depart,
      ret: validDate(f["return"]) && f["return"] >= depart ? f["return"] : validDate(f.depart) ? "" : addDays(19),
      adults: Math.min(9, Math.max(1, parseInt(f.adults, 10) || 1)),
    };
  });
  const [options] = useState(() => {
    let o = (f.options || []).filter((x) => x && (x.airlines || x.label)).slice(0, 6);
    if (!o.length && f.airlines && f.airlines.length) o = [{ label: "", airlines: f.airlines, stops: "", duration: "", why: "" }];
    return o;
  });
  const [toName] = useState(() => AIRPORTS[cityToIata(f.to_iata) || cityToIata(f.to_city) || ""] || f.to_city || "");

  const c = { from: cityToIata(v.from), to: cityToIata(v.to), depart: v.depart, ret: v.ret && v.depart && v.ret < v.depart ? "" : v.ret, adults: v.adults };
  const ok = !!(c.from && c.to && c.from !== c.to && c.depart);
  const url = ok ? tripUrl(c.from, c.to, c.depart, c.ret, c.adults) : undefined;
  const routeUrl = ok && AIRPORTS[c.from] && AIRPORTS[c.to] ? tripRouteUrl(AIRPORTS[c.from], AIRPORTS[c.to], c.from, c.to) : null;
  const today = ymd(new Date());
  const linkStyle = { opacity: ok ? 1 : 0.45 };
  const needRoute = (e) => { if (!ok) { e.preventDefault(); const el = e.currentTarget.closest(".book-card").querySelector(".f-to"); if (el) el.focus(); } };
  const normalize = (field) => () => { const code = cityToIata(v[field]); if (code) setV((s) => ({ ...s, [field]: code })); };

  return (
    <div className="rich">
      <div className="book-card">
        <div className="book-head">
          <Icon name="plane" size={15} />
          <b>{L("Flights", "ফ্লাইট")}</b>
          <small>{L("Live prices on Trip.com", "লাইভ দাম Trip.com-এ")}</small>
        </div>
        <div className="book-route">
          <div className="iata">
            <input className="f-from" maxLength={3} value={v.from} aria-label={L("From airport code", "কোথা থেকে")} placeholder="DAC" onChange={(e) => setV({ ...v, from: e.target.value })} onBlur={normalize("from")} />
            <span className="f-from-city">{AIRPORTS[c.from] || (c.from ? c.from : L("From", "কোথা থেকে"))}</span>
          </div>
          <button type="button" className="swap" aria-label={L("Swap", "অদলবদল")} onClick={() => setV({ ...v, from: v.to, to: v.from })}>
            <Icon name="swap" size={15} />
          </button>
          <div className="iata" style={{ textAlign: "right" }}>
            <input className="f-to" maxLength={3} value={v.to} style={{ textAlign: "right" }} aria-label={L("To airport code", "কোথায়")} placeholder={L("TO", "কোথায়")} onChange={(e) => setV({ ...v, to: e.target.value })} onBlur={normalize("to")} />
            <span className="f-to-city">{AIRPORTS[c.to] || (c.to ? c.to : L("Type a code, e.g. BKK", "কোড লিখুন, যেমন BKK"))}</span>
          </div>
        </div>
        <div className="book-grid">
          <div className="bf">
            <label>{L("Depart", "যাওয়া")}</label>
            <input type="date" className="f-dep" value={v.depart} min={today} onChange={(e) => setV({ ...v, depart: e.target.value, ret: v.ret && e.target.value && v.ret < e.target.value ? "" : v.ret })} />
          </div>
          <div className="bf">
            <label>{L("Return (optional)", "ফেরা (ঐচ্ছিক)")}</label>
            <input type="date" className="f-ret" value={c.ret} min={v.depart || today} onChange={(e) => setV({ ...v, ret: e.target.value })} />
          </div>
          <div className="bf wide">
            <label>{L("Travelers", "যাত্রী")}</label>
            <select className="f-pax" value={v.adults} onChange={(e) => setV({ ...v, adults: parseInt(e.target.value, 10) || 1 })}>
              {range(9).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {options.length > 0 && (
          <>
            <div className="opt-head">{L(options.length + " ways to fly this route", "এই রুটে " + options.length + "টি অপশন")}</div>
            <div className="opt-list">
              {options.map((o, i) => {
                const airlines = [].concat(o.airlines || []).filter(Boolean);
                const data = { from: c.from, to: c.to, fromCity: AIRPORTS[c.from] || "", toCity: AIRPORTS[c.to] || "", depart: c.depart, ret: c.ret, adults: c.adults, label: o.label || "", airlines, stops: o.stops || "", duration: o.duration || "" };
                return (
                  <div className="opt" key={i}>
                    <div className="opt-main">
                      <div className="opt-top">
                        {o.label ? <span className="opt-badge">{o.label}</span> : null}
                        <span className="opt-air">{airlines.join(" · ")}</span>
                      </div>
                      <div className="opt-line">{[o.stops, o.duration].filter(Boolean).join(" · ")}</div>
                      {o.why ? <div className="opt-why">{o.why}</div> : null}
                      <a className="opt-link" target="_blank" rel="noopener" href={url} style={linkStyle} onClick={needRoute}>
                        {L("Check on Trip.com", "Trip.com-এ দেখুন")} <Icon name="ext" size={13} sw={2.2} />
                      </a>
                    </div>
                    <SaveButton kind="flight" data={data} />
                  </div>
                );
              })}
            </div>
          </>
        )}
        {f.tip ? <div className="book-tip">💡 {f.tip}</div> : null}
        <a className="book-cta f-go" target="_blank" rel="noopener" href={url} style={linkStyle} onClick={needRoute}>
          {L("See all flights on Trip.com", "Trip.com-এ সব ফ্লাইট দেখুন")} →
        </a>
        {routeUrl && (
          <a className="book-sub f-route" target="_blank" rel="noopener" href={routeUrl}>
            {L("See typical fares for this route", "এই রুটের সাধারণ ভাড়া দেখুন")}
          </a>
        )}
        <div className="book-note">{L("Times are typical, not live. Check exact times and prices on Trip.com.", "সময় আনুমানিক। সঠিক সময় ও দাম Trip.com-এ দেখুন।")}</div>
      </div>
      {toName ? <MoreButton label={L("More flight options", "আরও ফ্লাইট অপশন")} prompt={L("Show me more flight options to ", "আরও ফ্লাইট অপশন দেখান: ") + toName} /> : null}
    </div>
  );
}

/* ---------------- hotels ---------------- */
function dayAfter(s) {
  const d = new Date(s);
  d.setDate(d.getDate() + 1);
  return ymd(d);
}

export function HotelCard({ h }) {
  h = h || {};
  const [v, setV] = useState(() => {
    const ci = validDate(h.checkin) ? h.checkin : addDays(14);
    const co = validDate(h.checkout) && h.checkout > ci ? h.checkout : (() => { const d = new Date(ci); d.setDate(d.getDate() + 3); return ymd(d); })();
    return { city: h.city || "", ci, co, ad: Math.min(16, Math.max(1, parseInt(h.adults, 10) || 2)), rm: Math.min(8, Math.max(1, parseInt(h.rooms, 10) || 1)) };
  });
  const [areas] = useState(() => (h.areas || []).filter((a) => a && a.name).slice(0, 4));
  const [options] = useState(() => (h.options || []).filter((o) => o && o.name).slice(0, 8));
  const baseCity = h.city || "";

  const city = v.city.trim();
  const n = nightsBetween(v.ci, v.co);
  const ok = !!(city && v.ci && v.co);
  const setCi = (ci) => setV((s) => ({ ...s, ci, co: ci && (!s.co || s.co <= ci) ? dayAfter(ci) : s.co }));

  return (
    <div className="rich">
      <div className="book-card">
        <div className="book-head">
          <Icon name="bed" size={15} />
          <b>{L("Places to stay", "থাকার জায়গা")}</b>
          <small>{L("Live prices on Booking.com", "লাইভ দাম Booking.com-এ")}</small>
        </div>
        <div className="book-grid" style={{ paddingTop: 12 }}>
          <div className="bf wide">
            <label>{L("Where", "কোথায়")}</label>
            <input type="text" className="h-city" value={v.city} placeholder={L("City, area or hotel", "শহর, এলাকা বা হোটেল")} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </div>
          <div className="bf">
            <label>{L("Check-in", "চেক-ইন")}</label>
            <input type="date" className="h-in" value={v.ci} min={ymd(new Date())} onChange={(e) => setCi(e.target.value)} />
          </div>
          <div className="bf">
            <label>{L("Check-out", "চেক-আউট")}</label>
            <input type="date" className="h-out" value={v.co} min={v.ci ? dayAfter(v.ci) : undefined} onChange={(e) => setV({ ...v, co: e.target.value })} />
          </div>
          <div className="bf">
            <label>{L("Guests", "অতিথি")}</label>
            <select className="h-ad" value={v.ad} onChange={(e) => setV({ ...v, ad: parseInt(e.target.value, 10) || 2 })}>
              {range(16).map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="bf">
            <label>{L("Rooms", "রুম")}</label>
            <select className="h-rm" value={v.rm} onChange={(e) => setV({ ...v, rm: parseInt(e.target.value, 10) || 1 })}>
              {range(8).map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        {options.length > 0 && (
          <>
            <div className="opt-head">{L(options.length + " stays to consider · swipe →", options.length + "টি থাকার জায়গা · সোয়াইপ করুন →")}</div>
            <div className="hotel-row">
              {options.map((o, i) => {
                const data = { name: o.name, city: baseCity || city, area: o.area || "", type: o.type || "", budget: o.budget || "", checkin: v.ci, checkout: v.co, adults: v.ad, rooms: v.rm };
                const where = baseCity || city;
                return (
                  <div className="hotel-card" key={o.name + i}>
                    <div className="hotel-media" role="button" tabIndex={0} onClick={() => showPlace("hotel", { ...o, city: where }, where)}>
                      <Photo q={{ name: o.name, context: where, kind: "hotel" }} icon="bed" />
                      <SaveButton kind="hotel" data={data} onImage />
                    </div>
                    <div className="hotel-body">
                      <div className="hotel-name">{o.name}</div>
                      <div className="hotel-meta">
                        {[o.type, o.area].filter(Boolean).join(" · ")}
                        {o.budget ? <> <span className="budget">{o.budget}</span></> : null}
                      </div>
                      {o.why ? <div className="hotel-why">{o.why}</div> : null}
                      <a className="opt-link h-link" target="_blank" rel="noopener" href={v.ci && v.co ? bookingUrl(o.name + (where ? ", " + where : ""), v.ci, v.co, v.ad, v.rm) : undefined}>
                        {L("See on Booking.com", "Booking.com-এ দেখুন")} <Icon name="ext" size={13} sw={2.2} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {areas.length > 0 && (
          <>
            <div className="book-tip" style={{ paddingBottom: 4 }}>
              <strong style={{ color: "var(--ink)" }}>{L("Good areas to stay", "থাকার জন্য ভালো এলাকা")}</strong>
            </div>
            <div className="chips-mini h-areas">
              {areas.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  className="chip-mini"
                  style={{ border: "none" }}
                  onClick={() => setV({ ...v, city: a.name + (baseCity && a.name.toLowerCase().indexOf(baseCity.toLowerCase()) < 0 ? ", " + baseCity : "") })}
                >
                  <b>{a.name}</b>{a.why ? " · " + a.why : ""}
                </button>
              ))}
            </div>
          </>
        )}
        <a
          className="book-cta h-go"
          target="_blank"
          rel="noopener"
          href={ok ? bookingUrl(city, v.ci, v.co, v.ad, v.rm) : undefined}
          style={{ opacity: ok ? 1 : 0.45 }}
          onClick={(e) => { if (!ok) { e.preventDefault(); const el = e.currentTarget.closest(".book-card").querySelector(".h-city"); if (el) el.focus(); } }}
        >
          {L("See all hotels on Booking.com", "Booking.com-এ সব হোটেল দেখুন") + (n > 0 ? " · " + n + L(n === 1 ? " night" : " nights", " রাত") : "") + " →"}
        </a>
        <div className="book-note">{L("Hotel ideas come from Tripo's knowledge. Check availability and prices on Booking.com.", "হোটেলের আইডিয়া Tripo-র জ্ঞান থেকে। সঠিক দাম ও খালি রুম Booking.com-এ দেখুন।")}</div>
      </div>
      {h.city ? <MoreButton label={L("More hotels", "আরও হোটেল")} prompt={L("Show me more hotels in ", "আরও হোটেল দেখান: ") + h.city} /> : null}
    </div>
  );
}
