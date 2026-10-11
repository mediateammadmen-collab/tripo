// Small shared helpers: escaping, dates, ids, rich text.
import { getLang } from "./i18n";

export function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
export function ymd(d){ var m = d.getMonth()+1, day = d.getDate(); return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day; }
export function addDays(n){ var d = new Date(); d.setDate(d.getDate()+n); return ymd(d); }
export function validDate(s){ return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= ymd(new Date()); }

/* rich text: **bold**, "- " bullet lines, paragraphs */
export function richText(s){
  var lines = String(s || "").split(/\n/);
  var html = "", inList = false, para = [];
  function flushPara(){ if (para.length){ html += "<p>"+para.join("<br>")+"</p>"; para = []; } }
  lines.forEach(function(line){
    var l = line.trim();
    var b = l.match(/^([-•*]|\d+[.)])\s+(.*)$/);
    var fmt = function(x){ return esc(x).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); };
    if (b){ flushPara(); if (!inList){ html += "<ul>"; inList = true; } html += "<li>"+fmt(b[2])+"</li>"; }
    else {
      if (inList){ html += "</ul>"; inList = false; }
      if (!l) flushPara(); else para.push(fmt(l));
    }
  });
  if (inList) html += "</ul>";
  flushPara();
  return html;
}
export function nightsBetween(a, b){ var d = (new Date(b) - new Date(a)) / 86400000; return isFinite(d) ? Math.round(d) : 0; }
export function fmtTime(ms){ if (!ms) return ""; var d = new Date(ms); var h = d.getHours(), m = d.getMinutes(); var ap = h>=12?"PM":"AM"; h = h%12||12; return h+":"+(m<10?"0":"")+m+" "+ap; }
export function uid(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
export function clean(o){ return JSON.parse(JSON.stringify(o, function(k,v){ return v === undefined ? null : v; })); }
export function fmtDate(s){
  if (!validDateAny(s)) return "";
  var d = new Date(s+"T00:00:00");
  var m = getLang() === "bn" ? ["জানু","ফেব্রু","মার্চ","এপ্রি","মে","জুন","জুলা","আগ","সেপ্টে","অক্টো","নভে","ডিসে"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + " " + m[d.getMonth()];
}
export function validDateAny(s){ return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
export function nowTime(){
  var d = new Date(); var h = d.getHours(); var m = d.getMinutes();
  var ampm = h >= 12 ? "PM" : "AM"; var h12 = h % 12; if (h12 === 0) h12 = 12;
  var mm = m < 10 ? "0"+m : ""+m;
  return h12 + ":" + mm + " " + ampm;
}
export const FRIEND_COLORS = ["#E5232B","#B8161D","#7A0F14","#D94F4F","#C23A3A"];
export function initials(name){
  var parts = name.trim().split(/\s+/);
  var s = parts[0] ? parts[0][0] : "?";
  if (parts[1]) s += parts[1][0];
  return s.toUpperCase();
}
export function slug(s){ return String(s||"").toLowerCase().replace(/['’.]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
