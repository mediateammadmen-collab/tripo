// Builds the downloadable "my plan" page (a self-contained HTML file).
import { L, getLang } from "./i18n";
import { esc, ymd, fmtDate } from "./util";
import { sceneSVG } from "./scene";
import { itemTitle, itemSub, itemLink, tripDates } from "./items";

var ICON_PLANE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V4a1.5 1.5 0 00-3 0v5l-8 5v2l8-2.5V19l-2.5 1.5V22l4-1 4 1v-1.5L13 19v-5.5z"/></svg>';

export function planDocHTML(title, tripList, loose, saved){
  var lang = getLang();
  function tripItems(tr){ return saved.filter(function(x){ return x.tripId === tr.id; }); }
  var css = 'body{margin:0;background:#F4F4F4;font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif;color:#0A0A0A;}'+
    '.wrap{max-width:760px;margin:0 auto;padding:24px 16px 48px;}'+
    '.brand{display:flex;align-items:center;justify-content:space-between;background:#FFFC00;border-radius:18px;padding:16px 20px;margin-bottom:18px;}'+
    '.brand b{font-size:22px;letter-spacing:-.02em}.brand span{font-size:12px;font-weight:600;opacity:.7}'+
    'h1{font-size:26px;margin:0 0 4px}.muted{color:#6B6B6B;font-size:13px}'+
    '.trip{background:#fff;border-radius:18px;overflow:hidden;margin:18px 0;box-shadow:0 1px 3px rgba(0,0,0,.1);page-break-inside:avoid;}'+
    '.banner{position:relative;height:180px}.banner svg{display:block;width:100%;height:100%}'+
    '.banner .ov{position:absolute;left:0;right:0;bottom:0;padding:30px 18px 12px;background:linear-gradient(transparent,rgba(0,0,0,.6));color:#fff}'+
    '.banner h2{margin:0;font-size:24px}.banner p{margin:2px 0 0;font-size:13px;opacity:.92}'+
    '.sec{padding:14px 18px 4px}.sec h3{font-size:15px;margin:0 0 8px}'+
    '.day{display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed #E5E5E5}.day:last-child{border-bottom:none}'+
    '.dn{min-width:34px;height:34px;border-radius:9px;background:#FFFC00;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}'+
    '.it{display:flex;gap:12px;align-items:flex-start;border:1px solid #E5E5E5;border-radius:12px;padding:10px;margin-bottom:8px}'+
    '.th{width:56px;height:56px;border-radius:10px;overflow:hidden;flex:0 0 auto;background:#FFFC00;display:flex;align-items:center;justify-content:center}.th svg{width:100%;height:100%;display:block}'+
    '.t{font-weight:700;font-size:14px}.s{font-size:12.5px;color:#6B6B6B;margin-top:2px}'+
    'a{color:#0A0A0A;font-weight:700;font-size:12.5px}.empty{font-size:12.5px;color:#9A9A9A;padding-bottom:10px}'+
    '.foot{font-size:11.5px;color:#6B6B6B;text-align:center;margin-top:24px;line-height:1.6}'+
    '@media print{body{background:#fff}.trip{box-shadow:none;border:1px solid #ddd}.noprint{display:none}}';
  function itemHTML(it){
    var link = itemLink(it);
    var thumb = it.kind === "flight" ? '<div class="th">'+ICON_PLANE+'</div>' : '<div class="th">'+(it.kind === "hotel" ? sceneSVG("hotel", it.data.name) : sceneSVG(it.data.scene, (it.data.name||"")+" "+(it.data.country||"")))+'</div>';
    return '<div class="it">'+thumb+'<div><div class="t">'+esc(itemTitle(it))+'</div><div class="s">'+esc(itemSub(it))+'</div>'+
      (link ? '<div style="margin-top:5px"><a href="'+esc(link)+'" target="_blank" rel="noopener">'+esc(it.kind === "flight" ? L("Check prices on Trip.com →","Trip.com-এ দাম দেখুন →") : L("Check prices on Booking.com →","Booking.com-এ দাম দেখুন →"))+'</a></div>' : '')+
      '</div></div>';
  }
  function group(items, kind, label){
    var list = items.filter(function(x){ return x.kind === kind; });
    return '<div class="sec"><h3>'+esc(label)+'</h3>'+(list.length ? list.map(itemHTML).join("") : '<div class="empty">'+esc(L("Nothing added yet","এখনো কিছু যোগ হয়নি"))+'</div>')+'</div>';
  }
  var body = '<div class="brand"><b>Tripo</b><span>'+esc(L("Made with Tripo · ","Tripo দিয়ে তৈরি · ")+fmtDate(ymd(new Date())))+'</span></div>'+
    '<h1>'+esc(title)+'</h1>';
  tripList.forEach(function(tr){
    var items = tripItems(tr);
    body += '<div class="trip"><div class="banner">'+sceneSVG(null, tr.dest || tr.name)+'<div class="ov"><h2>'+esc(tr.name)+'</h2><p>'+esc([tr.dest, tripDates(tr)].filter(Boolean).join(" · "))+'</p></div></div>';
    if (tr.itinerary && tr.itinerary.length){
      body += '<div class="sec"><h3>🗓 '+esc(L("Day-by-day plan","দিনভিত্তিক প্ল্যান"))+'</h3>'+tr.itinerary.map(function(d, i){
        return '<div class="day"><div class="dn">'+esc(L("D","দিন ")+(d.day || i+1))+'</div><div><div class="t">'+esc(d.title||"")+'</div><div class="s">'+esc(d.plan||"")+'</div></div></div>';
      }).join("")+'</div>';
    }
    body += group(items, "place", "📍 "+L("Places","জায়গা")) + group(items, "flight", "✈️ "+L("Flights","ফ্লাইট")) + group(items, "hotel", "🏨 "+L("Hotels","হোটেল")) + '<div style="height:8px"></div></div>';
  });
  if (loose && loose.length){
    body += '<div class="trip"><div class="sec" style="padding-top:18px"><h3>🔖 '+esc(L("Other saved items","অন্যান্য সেভ করা"))+'</h3>'+loose.map(itemHTML).join("")+'</div></div>';
  }
  body += '<div class="foot">'+esc(L("Flight times are typical. Prices and availability change — check the Trip.com and Booking.com links before you book.","ফ্লাইটের সময় আনুমানিক। দাম ও খালি রুম বদলায় — বুকিংয়ের আগে Trip.com ও Booking.com লিংক দেখে নিন।"))+
    '<br><span class="noprint">'+esc(L("Tip: use your browser's Print → Save as PDF to keep a PDF copy.","টিপ: PDF রাখতে ব্রাউজারের Print → Save as PDF ব্যবহার করুন।"))+'</span></div>';
  return '<!DOCTYPE html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+' · Tripo</title><style>'+css+'</style></head><body><div class="wrap">'+body+'</div></body></html>';
}

export function downloadHTML(filename, html){
  var url = URL.createObjectURL(new Blob([html], { type:"text/html" }));
  var a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}
