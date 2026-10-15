/* ---------------- place illustrations (drawn, no outside images needed) ---------------- */
export function hashStr(s){ var h = 2166136261; s = String(s||""); for (var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
function rng(seed){ return function(){ seed = (seed + 0x6D2B79F5)|0; var t = Math.imul(seed ^ (seed>>>15), 1|seed); t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t; return ((t ^ (t>>>14))>>>0)/4294967296; }; }
var SKIES = [
  ["#FFC46B","#FF7E5F","#FFF1C1"],   // sunset
  ["#6EC3F7","#D6F0FF","#FFFFFF"],   // day
  ["#5A4A9C","#F59A86","#FFD9A0"],   // dusk
  ["#16224D","#3F5FA8","#FFF6CF"]    // night
];
var SCENE_WORDS = [
  ["island", /maldives|male|malé|island|atoll|saint martin|st\.? martin|phuket|langkawi|boracay|seychelles|mauritius/i],
  ["beach", /beach|cox|coast|goa|pattaya|kuakata|sea|bay|lagoon|bali|nusa|krabi|miami|cancun|resort/i],
  ["snow", /snow|ski|swiss|switzerland|alps|iceland|lapland|gulmarg|norway|finland/i],
  ["mountain", /mountain|kashmir|nepal|kathmandu|pokhara|himalaya|sajek|bandarban|bhutan|paro|darjeeling|sikkim|manali|shimla|fuji|hill|trek|valley|srinagar|ladakh|tbilisi|georgia|rangamati/i],
  ["desert", /desert|dubai|abu dhabi|riyadh|jeddah|saudi|oman|muscat|morocco|marrakech|sahara|egypt|cairo|jordan|petra|qatar|doha|rajasthan|jaisalmer|umrah|makkah|mecca|madinah/i],
  ["forest", /sundarban|forest|jungle|mangrove|safari|tea|sylhet|srimangal|national park|rainforest|borneo/i],
  ["river", /river|boat|cruise|lake|ratargul|backwater|kerala|venice|halong|ha long|mekong|padma/i],
  ["temple", /temple|pagoda|bangkok|thailand|angkor|cambodia|myanmar|kyoto|varanasi|agra|taj|istanbul|mosque|ayutthaya|chiang|bodh|kolkata|delhi|india|sri lanka|kandy/i],
  ["oldtown", /lisbon|porto|portugal|prague|old town|europe|rome|italy|paris|barcelona|spain|greece|santorini|amsterdam|vienna|budapest|heritage|old dhaka|medina|hoi an/i],
  ["city", /city|singapore|tokyo|seoul|hong kong|shanghai|new york|london|kuala|kl|dhaka|mumbai|sydney|toronto|vietnam|hanoi|ho chi minh|japan|korea|china|usa|uk/i]
];
export const SCENES = ["beach","mountain","city","temple","desert","forest","island","oldtown","river","snow"];
export function guessScene(name){
  for (var i=0;i<SCENE_WORDS.length;i++){ if (SCENE_WORDS[i][1].test(name||"")) return SCENE_WORDS[i][0]; }
  return SCENES[hashStr(name) % SCENES.length];
}
// Rounds drawing coordinates so the server and the browser produce exactly the same picture
// (their sine/cosine can differ in the last decimal place).
function rd(n){ return Math.round(n * 10) / 10; }
function palm(x, y, h, r, lean){
  x = rd(x); y = rd(y); h = rd(h); lean = rd(lean);
  var tx = rd(x + lean), ty = rd(y - h), s = '<path d="M'+x+' '+y+' Q'+rd(x+lean*0.2)+' '+rd(y-h*0.6)+' '+tx+' '+ty+'" stroke="#5B3E22" stroke-width="4" fill="none" stroke-linecap="round"/>';
  for (var i=0;i<6;i++){
    var a = (-160 + i*28 + r()*8) * Math.PI/180, len = 22 + r()*8;
    var ex = rd(tx + Math.cos(a)*len), ey = rd(ty + Math.sin(a)*len*0.55 + 8);
    var mx = rd(tx + Math.cos(a)*len*0.5), my = rd(ty + Math.sin(a)*len*0.5 - 6);
    s += '<path d="M'+tx+' '+ty+' Q'+mx+' '+my+' '+ex+' '+ey+'" stroke="#1F6B45" stroke-width="5" fill="none" stroke-linecap="round"/>';
  }
  return s;
}
export function sceneSVG(scene, name){
  if (scene !== "hotel" && SCENES.indexOf(scene) < 0) scene = guessScene(name);
  var r = rng(hashStr((name||"")+"|"+scene));
  var skyI = Math.floor(r()*SKIES.length), sky = SKIES[skyI];
  var gid = "tg" + hashStr((name||"")+"|"+scene+"|"+skyI).toString(36);
  var s = '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
    '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+sky[0]+'"/><stop offset="1" stop-color="'+sky[1]+'"/></linearGradient></defs>'+
    '<rect width="320" height="180" fill="url(#'+gid+')"/>';
  if (skyI === 3){ for (var st=0; st<22; st++){ s += '<circle cx="'+(r()*320).toFixed(1)+'" cy="'+(r()*90).toFixed(1)+'" r="'+(0.6+r()*1.1).toFixed(1)+'" fill="#fff" opacity="'+(0.4+r()*0.6).toFixed(2)+'"/>'; } }
  var sx = 40 + r()*240, sy = 28 + r()*36, sr = 13 + r()*9;
  s += '<circle cx="'+sx.toFixed(1)+'" cy="'+sy.toFixed(1)+'" r="'+sr.toFixed(1)+'" fill="'+sky[2]+'"/>';
  // a couple of soft clouds
  if (skyI !== 3){ for (var c=0;c<2;c++){ var cx = r()*300, cy = 20 + r()*40; s += '<g fill="#fff" opacity=".7"><ellipse cx="'+cx.toFixed(0)+'" cy="'+cy.toFixed(0)+'" rx="22" ry="7"/><ellipse cx="'+(cx+14).toFixed(0)+'" cy="'+(cy-5).toFixed(0)+'" rx="13" ry="7"/></g>'; } }
  var i, x, h;
  switch (scene){
    case "beach":
      s += '<rect y="104" width="320" height="50" fill="#1C8DB5"/><rect y="104" width="320" height="8" fill="#5BC0DE" opacity=".6"/>';
      for (i=0;i<6;i++){ x = r()*300; s += '<path d="M'+x.toFixed(0)+' '+(116+i*6)+' q8 -4 16 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/>'; }
      s += '<path d="M0 142 Q90 126 180 136 T320 132 V180 H0Z" fill="#F2D59C"/><path d="M0 142 Q90 126 180 136 T320 132" stroke="#fff" stroke-width="3" fill="none" opacity=".75"/>';
      s += palm(250, 170, 70, r, 18) + palm(282, 172, 54, r, -10);
      s += '<path d="M60 150 l14 -18 l14 18 z" fill="#E84B3C"/><line x1="74" y1="150" x2="74" y2="164" stroke="#5B3E22" stroke-width="2"/>';
      break;
    case "island":
      s += '<rect y="98" width="320" height="82" fill="#1BA3C6"/><rect y="98" width="320" height="10" fill="#8EE3EF" opacity=".6"/>';
      s += '<ellipse cx="110" cy="128" rx="70" ry="12" fill="#F3DEA8"/><ellipse cx="110" cy="128" rx="84" ry="16" fill="#7FE0E6" opacity=".35"/>';
      s += palm(95, 126, 58, r, -14) + palm(125, 127, 46, r, 12);
      for (i=0;i<4;i++){ x = 200 + i*28; s += '<rect x="'+x+'" y="120" width="20" height="11" fill="#C98B54"/><path d="M'+(x-3)+' 121 L'+(x+10)+' 110 L'+(x+23)+' 121Z" fill="#8A5A2E"/><line x1="'+(x+4)+'" y1="131" x2="'+(x+4)+'" y2="142" stroke="#6B4A2B" stroke-width="2"/><line x1="'+(x+16)+'" y1="131" x2="'+(x+16)+'" y2="142" stroke="#6B4A2B" stroke-width="2"/>'; }
      s += '<rect x="196" y="131" width="116" height="3" fill="#8A5A2E"/>';
      break;
    case "mountain": case "snow":
      var snowy = scene === "snow";
      s += '<path d="M0 120 L50 70 L90 100 L150 48 L210 96 L260 60 L320 104 V180 H0Z" fill="'+(snowy?"#B9CCE6":"#8A9CC4")+'" opacity=".9"/>';
      s += '<path d="M150 48 L136 62 L146 60 L152 66 L160 58 L167 62Z M260 60 L249 71 L258 69 L264 74 L270 68Z" fill="#fff"/>';
      s += '<path d="M0 138 L70 88 L120 124 L180 82 L240 126 L320 96 V180 H0Z" fill="'+(snowy?"#E8F0FA":"#46597F")+'"/>';
      s += '<path d="M70 88 L60 96 L70 95 L77 100 L84 94Z M180 82 L168 92 L180 90 L188 96 L194 91Z" fill="#fff"/>';
      s += '<path d="M0 150 Q80 132 160 146 T320 140 V180 H0Z" fill="'+(snowy?"#FFFFFF":"#3E8A5C")+'"/>';
      for (i=0;i<9;i++){ x = 8 + i*36 + r()*10; h = 20 + r()*14; s += '<path d="M'+x.toFixed(0)+' '+(172-h).toFixed(0)+' l-9 '+h.toFixed(0)+' h18z" fill="'+(snowy?"#2E5E4E":"#1F5B3B")+'"/>'; if (snowy) s += '<path d="M'+x.toFixed(0)+' '+(172-h).toFixed(0)+' l-4 8 h8z" fill="#fff"/>'; }
      break;
    case "city":
      for (i=0;i<14;i++){ x = i*24 - 4; h = 40 + r()*50; s += '<rect x="'+x+'" y="'+(150-h).toFixed(0)+'" width="22" height="'+h.toFixed(0)+'" fill="#27335C" opacity=".45"/>'; }
      var tallX = 60 + r()*200;
      s += '<path d="M'+tallX.toFixed(0)+' 22 L'+(tallX+6).toFixed(0)+' 60 L'+(tallX+10).toFixed(0)+' 150 H'+(tallX-10).toFixed(0)+' L'+(tallX-6).toFixed(0)+' 60Z" fill="#1A2140"/>';
      for (i=0;i<11;i++){
        x = i*30 + r()*6; h = 34 + r()*56; var w = 22 + r()*8;
        s += '<rect x="'+x.toFixed(0)+'" y="'+(160-h).toFixed(0)+'" width="'+w.toFixed(0)+'" height="'+h.toFixed(0)+'" fill="#1A2140"/>';
        for (var wy = 160-h+6; wy < 154; wy += 9){ for (var wx = x+4; wx < x+w-5; wx += 7){ if (r() > 0.45) s += '<rect x="'+wx.toFixed(0)+'" y="'+wy.toFixed(0)+'" width="3" height="4" fill="#FFE27A" opacity=".85"/>'; } }
      }
      s += '<rect y="158" width="320" height="22" fill="#12182E"/><rect y="164" width="320" height="2" fill="#FFFC00" opacity=".5"/>';
      break;
    case "temple":
      s += '<path d="M0 150 Q160 136 320 150 V180 H0Z" fill="#C9A26B"/>';
      s += '<path d="M160 30 L166 70 Q192 84 196 118 H124 Q128 84 154 70Z" fill="#E6B03C"/><rect x="118" y="118" width="84" height="14" fill="#C98E2A"/><rect x="108" y="132" width="104" height="22" fill="#B5412F"/>';
      s += '<rect x="150" y="138" width="20" height="16" fill="#5B1F14"/>';
      for (var side=0; side<2; side++){
        var bx = side ? 250 : 50;
        for (i=0;i<4;i++){ var tw = 44 - i*10, ty2 = 150 - i*16; s += '<path d="M'+(bx-tw/2-6)+' '+ty2+' L'+(bx-tw/2)+' '+(ty2-12)+' H'+(bx+tw/2)+' L'+(bx+tw/2+6)+' '+ty2+'Z" fill="'+(i%2?"#B5412F":"#8E2F22")+'"/>'; }
        s += '<line x1="'+bx+'" y1="86" x2="'+bx+'" y2="102" stroke="#E6B03C" stroke-width="3"/>';
      }
      s += palm(20, 170, 48, r, 10) + palm(302, 170, 44, r, -10);
      break;
    case "desert":
      s += '<path d="M0 118 Q60 96 130 116 T260 104 T320 112 V180 H0Z" fill="#F2C57C"/>';
      s += '<path d="M0 140 Q90 112 170 136 T320 128 V180 H0Z" fill="#E3A355"/>';
      s += '<path d="M0 162 Q110 142 210 160 T320 156 V180 H0Z" fill="#D18A3F"/>';
      var ddx = 210 + r()*60;
      s += '<g fill="#7A4A21"><ellipse cx="'+ddx.toFixed(0)+'" cy="128" rx="12" ry="6"/><rect x="'+(ddx-9).toFixed(0)+'" y="130" width="2" height="9"/><rect x="'+(ddx+7).toFixed(0)+'" y="130" width="2" height="9"/><path d="M'+(ddx+10).toFixed(0)+' 126 l6 -8 l3 1 l-5 9z"/><circle cx="'+(ddx-1).toFixed(0)+'" cy="121" r="4"/></g>';
      s += '<path d="M40 104 v-26 l4 -8 l4 8 v26z M36 104 h16 v4 h-16z" fill="#8C5A2B" opacity=".55"/>';
      break;
    case "forest":
      s += '<rect y="96" width="320" height="84" fill="#2F6B45"/>';
      for (i=0;i<16;i++){ x = i*21 + r()*8; s += '<circle cx="'+x.toFixed(0)+'" cy="'+(96 - r()*10).toFixed(0)+'" r="'+(14+r()*8).toFixed(0)+'" fill="#255A39"/>'; }
      s += '<path d="M0 140 Q80 124 160 138 T320 132 V160 Q240 150 160 160 T0 156Z" fill="#3E86A6"/>';
      for (i=0;i<12;i++){ x = i*28 + r()*10; s += '<circle cx="'+x.toFixed(0)+'" cy="'+(170 + r()*6).toFixed(0)+'" r="'+(12+r()*6).toFixed(0)+'" fill="#1D4A2E"/>'; }
      s += '<path d="M130 146 q20 8 40 0 l-4 5 h-32z" fill="#6B3B1F"/><line x1="150" y1="146" x2="150" y2="126" stroke="#6B3B1F" stroke-width="1.5"/><path d="M151 128 l12 14 h-12z" fill="#F5E6C8"/>';
      break;
    case "river":
      s += '<path d="M0 104 Q80 94 160 102 T320 98 V180 H0Z" fill="#4A9B5E"/>';
      s += '<path d="M0 124 Q90 112 170 126 T320 118 V168 Q230 156 160 166 T0 162Z" fill="#3C8FB8"/>';
      for (i=0;i<5;i++){ x = 20 + r()*280; s += '<path d="M'+x.toFixed(0)+' '+(138+r()*16).toFixed(0)+' h18" stroke="#fff" stroke-width="1.4" opacity=".5"/>'; }
      var bx2 = 110 + r()*100;
      s += '<path d="M'+(bx2-34).toFixed(0)+' 140 Q'+bx2.toFixed(0)+' 156 '+(bx2+34).toFixed(0)+' 140 L'+(bx2+26).toFixed(0)+' 148 Q'+bx2.toFixed(0)+' 156 '+(bx2-26).toFixed(0)+' 148Z" fill="#5C3317"/>';
      s += '<path d="M'+(bx2-10).toFixed(0)+' 142 q10 -10 22 0z" fill="#8A5A2E"/><line x1="'+bx2.toFixed(0)+'" y1="142" x2="'+bx2.toFixed(0)+'" y2="104" stroke="#5C3317" stroke-width="2"/><path d="M'+(bx2+1).toFixed(0)+' 106 q18 16 2 32z" fill="#F1E3C4"/>';
      for (i=0;i<10;i++){ x = i*34 + r()*10; s += palm(x, 112 + r()*4, 22 + r()*10, r, (r()-0.5)*14); }
      break;
    case "hotel":
      var hc2 = ["#F4E3C8","#E9D2F0","#CDE8F2","#F6D5C3","#DDEBCF","#FBE7A6"][Math.floor(r()*6)];
      var acc = ["#C4552E","#2B6C8F","#1E9E55","#8A5A2E","#6A4C93"][Math.floor(r()*5)];
      s += '<rect y="150" width="320" height="30" fill="#8FC27A"/>';
      var bw = 150 + r()*50, bx0 = 160 - bw/2, bh = 90 + r()*30;
      s += '<rect x="'+bx0.toFixed(0)+'" y="'+(150-bh).toFixed(0)+'" width="'+bw.toFixed(0)+'" height="'+bh.toFixed(0)+'" fill="'+hc2+'"/>';
      s += '<rect x="'+(bx0-6).toFixed(0)+'" y="'+(144-bh).toFixed(0)+'" width="'+(bw+12).toFixed(0)+'" height="8" fill="'+acc+'"/>';
      for (var fy = 150-bh+12; fy < 128; fy += 18){ for (var fx = bx0+10; fx < bx0+bw-16; fx += 22){ s += '<rect x="'+fx.toFixed(0)+'" y="'+fy.toFixed(0)+'" width="12" height="10" fill="#7FB8D6"/><rect x="'+(fx-2).toFixed(0)+'" y="'+(fy+10).toFixed(0)+'" width="16" height="2" fill="'+acc+'"/>'; } }
      s += '<rect x="'+(160-14)+'" y="130" width="28" height="20" fill="'+acc+'"/><rect x="'+(160-20)+'" y="126" width="40" height="5" fill="#fff" opacity=".8"/>';
      s += '<rect x="20" y="158" width="110" height="14" rx="7" fill="#5CC8E6"/><rect x="26" y="161" width="30" height="2" fill="#fff" opacity=".7"/>';
      s += palm(bx0-18, 160, 56, r, -8) + palm(bx0+bw+18, 160, 50, r, 8);
      break;
    case "oldtown":
      s += '<path d="M0 90 Q160 70 320 96 V180 H0Z" fill="#9BB67A"/>';
      var pastel = ["#F6D06F","#F4A7A0","#9ED0E6","#F7E7C6","#C7E0A7","#F2B880"];
      for (var row=0; row<3; row++){
        for (i=0;i<9;i++){
          x = i*36 + row*12 - 10 + r()*6; var y0 = 104 + row*22; var hw = 26, hh = 18 + r()*6;
          s += '<rect x="'+x.toFixed(0)+'" y="'+(y0).toFixed(0)+'" width="'+hw+'" height="'+hh.toFixed(0)+'" fill="'+pastel[Math.floor(r()*pastel.length)]+'"/>';
          s += '<path d="M'+(x-2).toFixed(0)+' '+y0.toFixed(0)+' L'+(x+hw/2).toFixed(0)+' '+(y0-9).toFixed(0)+' L'+(x+hw+2).toFixed(0)+' '+y0.toFixed(0)+'Z" fill="#C4552E"/>';
          s += '<rect x="'+(x+5).toFixed(0)+'" y="'+(y0+5).toFixed(0)+'" width="4" height="5" fill="#3A3A3A" opacity=".5"/><rect x="'+(x+16).toFixed(0)+'" y="'+(y0+5).toFixed(0)+'" width="4" height="5" fill="#3A3A3A" opacity=".5"/>';
        }
      }
      s += '<rect y="168" width="320" height="12" fill="#6E6259"/>';
      var tx = 40 + r()*200;
      s += '<rect x="'+tx.toFixed(0)+'" y="150" width="54" height="20" rx="4" fill="#FFD21F"/><rect x="'+(tx+5).toFixed(0)+'" y="154" width="44" height="7" fill="#2B3A4A" opacity=".8"/><line x1="'+(tx+27).toFixed(0)+'" y1="150" x2="'+(tx+27).toFixed(0)+'" y2="140" stroke="#333" stroke-width="1.2"/>';
      break;
  }
  return s + "</svg>";
}
