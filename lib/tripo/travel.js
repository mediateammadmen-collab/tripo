// Airports and booking links (Trip.com flights, Booking.com hotels, WhatsApp).
import { L } from "./i18n";
import { slug } from "./util";
import { siteConfig } from "./config";

// Settings that can change while the app runs (the home city follows the traveler's profile).
export const runtime = Object.assign({ HOME_IATA: "DAC", HOME_CITY: "Dhaka", CURRENCY: "BDT" }, siteConfig);

/* ---------------- airports ---------------- */
export const AIRPORTS = {
  DAC:"Dhaka", CGP:"Chattogram", CXB:"Cox's Bazar", ZYL:"Sylhet", JSR:"Jashore", SPD:"Saidpur", RJH:"Rajshahi", BZL:"Barishal",
  BKK:"Bangkok", HKT:"Phuket", CNX:"Chiang Mai", DXB:"Dubai", AUH:"Abu Dhabi", DOH:"Doha", MCT:"Muscat", RUH:"Riyadh", JED:"Jeddah", MED:"Madinah",
  CCU:"Kolkata", DEL:"Delhi", BOM:"Mumbai", MAA:"Chennai", BLR:"Bengaluru", GOI:"Goa", SXR:"Srinagar", IXB:"Bagdogra", GAU:"Guwahati",
  KTM:"Kathmandu", PBH:"Paro", CMB:"Colombo", MLE:"Male", SIN:"Singapore", KUL:"Kuala Lumpur", DPS:"Bali", CGK:"Jakarta",
  SGN:"Ho Chi Minh City", HAN:"Hanoi", MNL:"Manila", HKG:"Hong Kong", CAN:"Guangzhou", PEK:"Beijing", PVG:"Shanghai", KMG:"Kunming",
  TYO:"Tokyo", NRT:"Tokyo", HND:"Tokyo", OSA:"Osaka", ICN:"Seoul", IST:"Istanbul", TBS:"Tbilisi", CAI:"Cairo",
  LON:"London", LHR:"London", PAR:"Paris", CDG:"Paris", LIS:"Lisbon", ROM:"Rome", FCO:"Rome", AMS:"Amsterdam", FRA:"Frankfurt",
  NYC:"New York", JFK:"New York", YTO:"Toronto", YYZ:"Toronto", SYD:"Sydney", MEL:"Melbourne"
};
export function cityToIata(v){
  v = String(v||"").trim(); if (!v) return "";
  if (/^[A-Za-z]{3}$/.test(v)) return v.toUpperCase();
  var low = v.toLowerCase();
  for (var k in AIRPORTS){ if (AIRPORTS[k].toLowerCase() === low) return k; }
  for (var k2 in AIRPORTS){ if (AIRPORTS[k2].toLowerCase().indexOf(low) === 0) return k2; }
  return "";
}

export function tripUrl(from, to, depart, ret, adults){
  var q = "dcity="+from.toLowerCase()+"&acity="+to.toLowerCase()+"&ddate="+depart+
    (ret ? "&rdate="+ret+"&triptype=rt" : "&triptype=ow")+"&class=y&quantity="+adults+"&curr="+runtime.CURRENCY;
  if (runtime.TRIP_ALLIANCE_ID) q += "&Allianceid="+encodeURIComponent(runtime.TRIP_ALLIANCE_ID);
  if (runtime.TRIP_SID) q += "&SID="+encodeURIComponent(runtime.TRIP_SID);
  return "https://www.trip.com/flights/showfarefirst?"+q;
}
export function tripRouteUrl(fromCity, toCity, from, to){
  return "https://www.trip.com/flights/"+slug(fromCity)+"-to-"+slug(toCity)+"/airfares-"+from.toLowerCase()+"-"+to.toLowerCase()+"/";
}
export function bookingUrl(city, checkin, checkout, adults, rooms){
  var q = "ss="+encodeURIComponent(city)+"&checkin="+checkin+"&checkout="+checkout+"&group_adults="+adults+"&no_rooms="+rooms+"&group_children=0&selected_currency="+runtime.CURRENCY;
  if (runtime.BOOKING_AID) q += "&aid="+encodeURIComponent(runtime.BOOKING_AID);
  return "https://www.booking.com/searchresults.html?"+q;
}
export function whatsappUrl(text){
  return "https://wa.me/"+runtime.AGENT_WHATSAPP.replace(/\D/g,"")+"?text="+encodeURIComponent(text || L("Hi Tripo! I'd like help planning a trip.","হাই Tripo! ট্রিপ প্ল্যান করতে সাহায্য চাই।"));
}
