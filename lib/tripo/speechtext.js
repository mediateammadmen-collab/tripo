// Preparing AI replies for text-to-speech.
export function vCleanForSpeech(s){
  return String(s || "").split(/\n+/).map(function(l){
      l = l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\*\*/g, "").replace(/^\s*([-•*]|\d+[.)])\s+/, "").trim();
      return l && !/[.!?।:,]$/.test(l) ? l + "." : l;
    }).join(" ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/→/g, " to ")
    .replace(/\s+/g, " ").trim();
}
export function vSplit(s){
  var parts = s.match(/[^.!?।]+[.!?।]*/g) || [s];
  var out = [], cur = "";
  parts.forEach(function(p){ if ((cur + p).length > 180){ if (cur) out.push(cur.trim()); cur = p; } else cur += p; });
  if (cur.trim()) out.push(cur.trim());
  return out;
}
