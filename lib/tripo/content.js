// Starter content: quick-chip categories, idea cards, Dhaka picks, sign-up questions.
import { L } from "./i18n";

export const TABS = ["planForMe","nearby","newPlace","planTrip","packages","stay","flights","inspiration"];
export const CONTENT = {
  planForMe: [
    { color:"#E5232B", tag:{en:"Smart plan",bn:"স্মার্ট প্ল্যান"}, title:{en:"5 days, low budget",bn:"৫ দিন, কম বাজেট"}, sub:{en:"Tell Tripo your dates",bn:"তারিখ বলুন"} },
    { color:"#B8161D", tag:{en:"Smart plan",bn:"স্মার্ট প্ল্যান"}, title:{en:"Long weekend, relaxed",bn:"লম্বা উইকেন্ড, আরাম"}, sub:{en:"Few stops, more time each",bn:"কম স্টপ, বেশি সময়"} },
    { color:"#7A0F14", tag:{en:"Smart plan",bn:"স্মার্ট প্ল্যান"}, title:{en:"Surprise me",bn:"চমক দিন"}, sub:{en:"Tripo picks the place",bn:"গন্তব্যও বেছে নেবে"} }
  ],
  nearby: [
    { color:"#E5232B", tag:{en:"History",bn:"ইতিহাস"}, title:{en:"Lalbagh Fort",bn:"লালবাগ কেল্লা"}, sub:{en:"Mughal-era fort",bn:"মুঘল আমলের কেল্লা"} },
    { color:"#B8161D", tag:{en:"Walk",bn:"হাঁটা"}, title:{en:"Hatirjheel evening walk",bn:"হাতিরঝিলে সন্ধ্যার হাঁটা"}, sub:{en:"Lakeside lights",bn:"লেকের ধারে আলো"} },
    { color:"#7A0F14", tag:{en:"Food",bn:"খাবার"}, title:{en:"Old Dhaka food walk",bn:"পুরান ঢাকা ফুড ওয়াক"}, sub:{en:"Street food trail",bn:"স্ট্রিট ফুড ট্রেইল"} }
  ],    newPlace: [
    { color:"#E5232B", tag:{en:"Place",bn:"জায়গা"}, title:{en:"Japan",bn:"জাপান"}, sub:{en:"Temples, bullet trains",bn:"মন্দির, বুলেট ট্রেন"} },
    { color:"#B8161D", tag:{en:"Place",bn:"জায়গা"}, title:{en:"Morocco",bn:"মরক্কো"}, sub:{en:"Desert camps, medinas",bn:"মরুভূমির ক্যাম্প"} },
    { color:"#7A0F14", tag:{en:"Place",bn:"জায়গা"}, title:{en:"Portugal",bn:"পর্তুগাল"}, sub:{en:"Coastal towns, fado",bn:"উপকূলীয় শহর"} }
  ],
  planTrip: [
    { color:"#E5232B", tag:{en:"Prompt",bn:"প্রম্পট"}, title:{en:"7-day Bali itinerary",bn:"৭ দিনের বালি"}, sub:{en:"Beaches, temples",bn:"সৈকত, মন্দির"} },
    { color:"#B8161D", tag:{en:"Prompt",bn:"প্রম্পট"}, title:{en:"Weekend near Dhaka",bn:"ঢাকার কাছে উইকেন্ড"}, sub:{en:"2 days, no flights",bn:"২ দিন, ফ্লাইট ছাড়া"} },
    { color:"#7A0F14", tag:{en:"Prompt",bn:"প্রম্পট"}, title:{en:"Family: Sundarbans",bn:"সুন্দরবনে পরিবার"}, sub:{en:"Mangrove safari",bn:"ম্যানগ্রোভ সাফারি"} }
  ],
  packages: [
    { color:"#E5232B", tag:{en:"3N/4D",bn:"৩রাত/৪দিন"}, title:{en:"Cox's Bazar getaway",bn:"কক্সবাজার ছুটি"}, sub:{en:"Flight + beach hotel",bn:"ফ্লাইট + হোটেল"} },
    { color:"#B8161D", tag:{en:"5N/6D",bn:"৫রাত/৬দিন"}, title:{en:"Bali honeymoon",bn:"বালি হানিমুন"}, sub:{en:"Villa, spa, tours",bn:"ভিলা, স্পা, ট্যুর"} },
    { color:"#7A0F14", tag:{en:"4N/5D",bn:"৪রাত/৫দিন"}, title:{en:"Kashmir in bloom",bn:"কাশ্মীর ফুলের মৌসুমে"}, sub:{en:"Houseboat, gardens",bn:"হাউজবোট, বাগান"} }
  ],
  stay: [
    { color:"#E5232B", tag:{en:"Hotel",bn:"হোটেল"}, title:{en:"Boutique, old town",bn:"বুটিক, পুরনো শহর"}, sub:{en:"Walkable, quiet",bn:"হাঁটার দূরত্বে"} },
    { color:"#B8161D", tag:{en:"Resort",bn:"রিসোর্ট"}, title:{en:"Beachfront resort",bn:"সৈকত রিসোর্ট"}, sub:{en:"Pool, private beach",bn:"পুল, প্রাইভেট বিচ"} },
    { color:"#7A0F14", tag:{en:"Homestay",bn:"হোমস্টে"}, title:{en:"Hillside homestay",bn:"পাহাড়ি হোমস্টে"}, sub:{en:"Home-cooked meals",bn:"বাড়ির খাবার"} }
  ],
  flights: [
    { color:"#E5232B", tag:{en:"Route",bn:"রুট"}, title:{en:"Dhaka → Bangkok",bn:"ঢাকা → ব্যাংকক"}, sub:{en:"Popular route",bn:"জনপ্রিয় রুট"} },
    { color:"#B8161D", tag:{en:"Route",bn:"রুট"}, title:{en:"Dhaka → Dubai",bn:"ঢাকা → দুবাই"}, sub:{en:"Popular route",bn:"জনপ্রিয় রুট"} },
    { color:"#7A0F14", tag:{en:"Route",bn:"রুট"}, title:{en:"Dhaka → Kolkata",bn:"ঢাকা → কলকাতা"}, sub:{en:"Short hop",bn:"অল্প সময়ের ফ্লাইট"} }
  ],
  inspiration: [
    { color:"#E5232B", tag:{en:"Trip idea",bn:"ট্রিপ আইডিয়া"}, title:{en:"10 days in Vietnam",bn:"ভিয়েতনামে ১০ দিন"}, sub:{en:"Hanoi to HCMC",bn:"হ্যানয় থেকে HCMC"} },
    { color:"#B8161D", tag:{en:"Trip idea",bn:"ট্রিপ আইডিয়া"}, title:{en:"Sundarbans safari",bn:"সুন্দরবন সাফারি"}, sub:{en:"3 days by boat",bn:"নৌকায় ৩ দিন"} },
    { color:"#7A0F14", tag:{en:"Trip idea",bn:"ট্রিপ আইডিয়া"}, title:{en:"Slow week, Lisbon",bn:"লিসবনে ধীর সপ্তাহ"}, sub:{en:"No rushing",bn:"তাড়াহুড়ো নেই"} }
  ]
};

export const NEARBY_ITEMS = [
  { category:"stay", color:"#0A0A0A", title:{en:"Pan Pacific Sonargaon",bn:"প্যান প্যাসিফিক সোনারগাঁও"}, sub:{en:"5-star hotel · Karwan Bazar",bn:"৫-তারা হোটেল · কারওয়ান বাজার"} },
  { category:"stay", color:"#B8161D", title:{en:"The Westin Dhaka",bn:"দ্য ওয়েস্টিন ঢাকা"}, sub:{en:"Business hotel · Gulshan",bn:"বিজনেস হোটেল · গুলশান"} },
  { category:"stay", color:"#8A6E4B", title:{en:"Cozy boutique stay",bn:"আরামদায়ক বুটিক স্টে"}, sub:{en:"Dhanmondi · quiet street",bn:"ধানমন্ডি · শান্ত রাস্তা"} },
  { category:"restaurant", color:"#FFFC00", title:{en:"Kacchi Bhai",bn:"কাচ্চি ভাই"}, sub:{en:"Kacchi biryani · Gulshan",bn:"কাচ্চি বিরিয়ানি · গুলশান"} },
  { category:"restaurant", color:"#7A0F14", title:{en:"Bao House Dhaka",bn:"বাও হাউজ ঢাকা"}, sub:{en:"Asian fusion · Banani",bn:"এশিয়ান ফিউশন · বনানী"} },
  { category:"restaurant", color:"#3E6E63", title:{en:"Star Kabab & Restaurant",bn:"স্টার কাবাব অ্যান্ড রেস্টুরেন্ট"}, sub:{en:"Local classics · Dhanmondi",bn:"লোকাল ক্লাসিক · ধানমন্ডি"} },
  { category:"things", color:"#B8161D", title:{en:"Lalbagh Fort",bn:"লালবাগ কেল্লা"}, sub:{en:"Mughal-era fort · Old Dhaka",bn:"মুঘল আমলের কেল্লা · পুরান ঢাকা"} },
  { category:"things", color:"#0A0A0A", title:{en:"Ahsan Manzil",bn:"আহসান মঞ্জিল"}, sub:{en:"Pink Palace museum",bn:"পিংক প্যালেস জাদুঘর"} },
  { category:"things", color:"#8A6E4B", title:{en:"Dhaka University campus walk",bn:"ঢাকা বিশ্ববিদ্যালয় ক্যাম্পাস হাঁটা"}, sub:{en:"Curzon Hall, TSC area",bn:"কার্জন হল, টিএসসি এলাকা"} },
  { category:"experience", color:"#3E6E63", title:{en:"Sunset boat ride, Buriganga",bn:"বুড়িগঙ্গায় সূর্যাস্ত নৌকা ভ্রমণ"}, sub:{en:"Sadarghat · 1 hour",bn:"সদরঘাট · ১ ঘণ্টা"} },
  { category:"experience", color:"#FFFC00", title:{en:"Old Dhaka food walk",bn:"পুরান ঢাকা ফুড ওয়াক"}, sub:{en:"Street food trail, evening",bn:"স্ট্রিট ফুড ট্রেইল, সন্ধ্যা"} },
  { category:"experience", color:"#B8161D", title:{en:"Rickshaw art tour",bn:"রিকশা আর্ট ট্যুর"}, sub:{en:"Local craft, 2 hours",bn:"স্থানীয় কারুশিল্প, ২ ঘণ্টা"} }
];
export const NEARBY_FILTERS = ["all","stay","restaurant","things","experience"];
export const AGENT_QUICK_KEYS = ["planTrip", "packages", "stay", "flights"];

function O(v, en, bn){ return { v:v, en:en, bn:bn }; }
export const OB_QUESTIONS = [
  { id:"name", type:"text", required:true,
    q:function(){ return L("Hi! I'm Tripo 👋 your travel buddy. Let's set up your profile so I can suggest trips you'll really love.\n\nFirst, what should I call you?",
                         "হাই! আমি Tripo 👋 আপনার ভ্রমণ সঙ্গী। আপনার প্রোফাইল বানাই, যাতে আপনার পছন্দমতো ট্রিপ সাজেস্ট করতে পারি।\n\nপ্রথমে, আপনাকে কী নামে ডাকব?"); },
    placeholder:function(){ return L("Your first name","আপনার নাম"); } },
  { id:"home", type:"single", other:true,
    q:function(p){ return L("Nice to meet you, **"+p.name+"**! Where do you usually travel from?","আপনার সাথে পরিচিত হয়ে ভালো লাগল, **"+p.name+"**! সাধারণত কোথা থেকে ভ্রমণ শুরু করেন?"); },
    options:[O("Dhaka","📍 Dhaka","📍 ঢাকা"),O("Chattogram","📍 Chattogram","📍 চট্টগ্রাম"),O("Sylhet","📍 Sylhet","📍 সিলেট"),O("Kolkata","📍 Kolkata","📍 কলকাতা"),O("__other","✏️ Somewhere else","✏️ অন্য কোথাও")] },
  { id:"style", type:"multi", max:2,
    q:function(){ return L("What kind of traveler are you? Pick up to **2**.","আপনি কেমন ভ্রমণকারী? **২টি** পর্যন্ত বেছে নিন।"); },
    options:[O("Adventurer","🧗 Adventurer","🧗 অ্যাডভেঞ্চারার"),O("Relaxer","🏝 Relaxer","🏝 আরামপ্রিয়"),O("Culture explorer","🏛 Culture explorer","🏛 সংস্কৃতিপ্রেমী"),O("Foodie","🍜 Foodie","🍜 খাদ্যপ্রেমী"),O("Budget backpacker","🎒 Budget backpacker","🎒 বাজেট ব্যাকপ্যাকার"),O("Luxury lover","✨ Luxury lover","✨ বিলাসপ্রিয়"),O("Spiritual traveler","🕌 Spiritual traveler","🕌 আধ্যাত্মিক ভ্রমণকারী")] },
  { id:"likes", type:"multi",
    q:function(){ return L("What do you love on a trip? Pick as many as you like.","ভ্রমণে কী ভালোবাসেন? যত খুশি বেছে নিন।"); },
    options:[O("Beaches","🏖 Beaches","🏖 সমুদ্রসৈকত"),O("Mountains & hills","⛰ Mountains & hills","⛰ পাহাড়"),O("City life","🏙 City life","🏙 শহর"),O("Food","🍲 Food","🍲 খাবার"),O("History & culture","🏯 History & culture","🏯 ইতিহাস ও সংস্কৃতি"),O("Nature & wildlife","🌿 Nature & wildlife","🌿 প্রকৃতি ও বন্যপ্রাণী"),O("Shopping","🛍 Shopping","🛍 শপিং"),O("Nightlife","🌙 Nightlife","🌙 নাইটলাইফ"),O("Photography","📸 Photography","📸 ফটোগ্রাফি"),O("Adventure sports","🪂 Adventure sports","🪂 অ্যাডভেঞ্চার স্পোর্টস")] },
  { id:"company", type:"single",
    q:function(){ return L("Who do you usually travel with?","সাধারণত কার সাথে ভ্রমণ করেন?"); },
    options:[O("Solo","🙋 Solo","🙋 একা"),O("Partner","💑 Partner","💑 সঙ্গী"),O("Family with kids","👨‍👩‍👧 Family with kids","👨‍👩‍👧 পরিবার ও বাচ্চা"),O("Friends","👯 Friends","👯 বন্ধুরা"),O("Group or office","🧑‍🤝‍🧑 Group or office","🧑‍🤝‍🧑 গ্রুপ বা অফিস")] },
  { id:"budget", type:"single",
    q:function(){ return L("What's your usual budget per person for a trip?","প্রতি ট্রিপে জনপ্রতি সাধারণ বাজেট কত?"); },
    options:[O("Budget (under ৳50,000)","💰 Under ৳50k","💰 ৳৫০ হাজারের কম"),O("Mid-range (৳50,000–1.5 lakh)","💰💰 ৳50k – 1.5 lakh","💰💰 ৳৫০ হাজার – ১.৫ লাখ"),O("Comfort (৳1.5–3 lakh)","💰💰💰 ৳1.5 – 3 lakh","💰💰💰 ৳১.৫ – ৩ লাখ"),O("Luxury (over ৳3 lakh)","💎 Over ৳3 lakh","💎 ৳৩ লাখের বেশি")] },
  { id:"stays", type:"multi",
    q:function(){ return L("Where do you like to stay?","কোথায় থাকতে পছন্দ করেন?"); },
    options:[O("Hotels","🏨 Hotels","🏨 হোটেল"),O("Resorts","🌴 Resorts","🌴 রিসোর্ট"),O("Hostels","🛏 Hostels","🛏 হোস্টেল"),O("Guesthouses & homestays","🏡 Guesthouses & homestays","🏡 গেস্টহাউস ও হোমস্টে"),O("Apartments","🏢 Apartments","🏢 অ্যাপার্টমেন্ট")] },
  { id:"length", type:"single",
    q:function(){ return L("How long are your trips usually?","সাধারণত কত দিনের ট্রিপ করেন?"); },
    options:[O("Weekend getaways (2–3 days)","⚡ Weekend (2–3 days)","⚡ উইকেন্ড (২–৩ দিন)"),O("About a week","📅 About a week","📅 প্রায় এক সপ্তাহ"),O("Two weeks or more","🧳 2 weeks or more","🧳 ২ সপ্তাহ বা বেশি")] },
  { id:"dream", type:"text", optional:true,
    q:function(){ return L("Last one! 🌍 Is there a dream destination on your list?","শেষ প্রশ্ন! 🌍 কোনো স্বপ্নের গন্তব্য আছে?"); },
    placeholder:function(){ return L("e.g. Japan, Maldives, Switzerland","যেমন জাপান, মালদ্বীপ, সুইজারল্যান্ড"); } }
];
export const OB_REACT = {
  en:["Love that!","Great choice 👌","Noted!","Nice!","Perfect.","Got it 👍"],
  bn:["দারুণ!","ভালো পছন্দ 👌","বুঝেছি!","চমৎকার!","ঠিক আছে।","নোট করলাম 👍"]
};
