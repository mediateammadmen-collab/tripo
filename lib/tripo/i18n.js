// Language state + all interface text. Components read the language from the store
// (so they re-render), and call L()/t() while rendering.
let lang = "en";
export function getLang(){ return lang; }
export function setLangValue(l){ lang = l === "bn" ? "bn" : "en"; }
export function L(en, bn){ return lang === "bn" ? bn : en; }
export function t(key){
  var parts = key.split(".");
  var node = STR[lang];
  for (var i=0;i<parts.length;i++){ node = node && node[parts[i]]; }
  return node;
}

export const STR = {
  en: {
    inviteShort: "Invite friends", exploreLabel: "Explore",
    headStatus: "AI travel buddy · online",
    greeting: "Hi there! 👋 I'm Tripo, your travel buddy.\nTell me where you'd love to go, or tap an idea below. I can find **flights**, **hotels** and plan the whole trip.",
    chatPlaceholder: "Message Tripo",
    inviteTitle: "Invite friends to this trip", friendPlaceholder: "Name or email", friendNameLabel: "Friend's name",
    addBtn: "Add", shareLink: "Share Tripo with friends", linkCopied: "Link copied — send it to your friends",
    emptyFriends: "No one added yet — invite your travel crew.", micUnsupported: "Voice input isn't supported in this browser.",
    moreLabel: "Ask Tripo about this",
    tabs: { planForMe:"Plan for me", nearby:"Nearby", newPlace:"New place", planTrip:"Plan a trip", packages:"Travel packages", stay:"Stay", flights:"Flight", inspiration:"Inspiration" },
    resultsIntro: {
      planForMe:"Love it! Pick a style below, or just tell me your **dates** and **budget** and I'll plan everything 🗺️",
      nearby:"Here's what's good near you right now:", newPlace:"Somewhere new? These are worth a look 👀",
      planTrip:"Tap one to start planning, or tell me your own idea:", packages:"Trip ideas with flights and stays — tap one and I'll plan it:",
      stay:"Let's find you a great place to stay 🏨 Set your dates and I'll show live options on **Booking.com**.", flights:"Let's find your flight ✈️ Check the details and I'll open the best matches on **Trip.com**.",
      inspiration:"Trip ideas to get you started:"
    },
    tabNearby:"Nearby", tabExplore:"Explore", tabChats:"Chats", tabAgent:"My Agent", tabInspiration:"Inspiration", tabCommunities:"Communities", tabPlan:"My plan", tabProfile:"My profile",
    agentSub:"Quick ask — type or speak, no scrolling", tapToSpeak:"Tap to start a voice conversation", agentPlaceholder:"Ask Tripo anything…",
    agentGreeting:"Hi there! 👋 Where would you like to go? Tap an idea, type, or just speak.",
    agentActionAskAnything:"Ask me anything",
    communitiesSub:"Trip groups you're part of",
    rowPrivacy:"Privacy & data", rowHelp:"Help & support", rowTerms:"Terms of use",
    statTrips:"Trips", statFriends:"Friends", statCountries:"Countries",
    profileBio:"Tell Tripo your travel style and it will plan trips around you.",
    editProfile:"Edit profile", settingsHeading:"Settings",
    friendOnTripo:"On Tripo", friendMsgPlaceholder:"Message",
    chatsTripoSub:"AI travel assistant · tap to chat", chatsFriendSub:"Tap to say hi",
    friendDelivered:"Only you can see this for now — chatting with friends is coming soon.",
    nearbyLocation:"Popular picks in Dhaka",
    filterAll:"All", filterStay:"Stay", filterRestaurant:"Restaurant", filterThings:"Things to do", filterExperience:"Experience"
  },
  bn: {
    inviteShort: "বন্ধুদের আমন্ত্রণ", exploreLabel: "এক্সপ্লোর",
    headStatus: "আপনার AI ভ্রমণ সঙ্গী · অনলাইন",
    greeting: "হাই! 👋 আমি Tripo, আপনার ভ্রমণ সঙ্গী।\nকোথায় যেতে চান বলুন, অথবা নিচে থেকে বেছে নিন। **ফ্লাইট**, **হোটেল** আর পুরো ট্রিপ প্ল্যান — সব পারি।",
    chatPlaceholder: "Tripo-কে মেসেজ করুন",
    inviteTitle: "ট্রিপে বন্ধুদের আমন্ত্রণ জানান", friendPlaceholder: "নাম অথবা ইমেইল", friendNameLabel: "বন্ধুর নাম",
    addBtn: "যোগ করুন", shareLink: "বন্ধুদের সাথে Tripo শেয়ার করুন", linkCopied: "লিংক কপি হয়েছে — বন্ধুদের পাঠান",
    emptyFriends: "এখনো কেউ যোগ হয়নি — আপনার সঙ্গীদের আমন্ত্রণ জানান।", micUnsupported: "এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।",
    moreLabel: "Tripo-কে জিজ্ঞাসা করুন",
    tabs: { planForMe:"আমার জন্য প্ল্যান করুন", nearby:"কাছাকাছি", newPlace:"নতুন জায়গা", planTrip:"ট্রিপ প্ল্যান", packages:"ট্রাভেল প্যাকেজ", stay:"থাকার জায়গা", flights:"ফ্লাইট", inspiration:"অনুপ্রেরণা" },
    resultsIntro: {
      planForMe:"বেশ — তারিখ ও বাজেট বলুন, আমি পুরো ট্রিপ সাজিয়ে দেব। কিছু শুরুর আইডিয়া:",
      nearby:"এখন কাছাকাছি যা ভালো:", newPlace:"প্রথমবার দেখার মতো কিছু জায়গা:",
      planTrip:"পরিকল্পনার কিছু শুরুর পয়েন্ট:", packages:"ফ্লাইট আর থাকার জায়গাসহ ট্রিপ আইডিয়া — ট্যাপ করলে প্ল্যান করে দেব:",
      stay:"চলুন থাকার জায়গা খুঁজি 🏨 তারিখ দিন, **Booking.com**-এ লাইভ অপশন দেখাব।", flights:"চলুন ফ্লাইট খুঁজি ✈️ তথ্যগুলো দেখে নিন, **Trip.com**-এ সেরা অপশন খুলে দেব।",
      inspiration:"শুরু করার মতো কিছু ট্রিপ আইডিয়া:"
    },
    tabNearby:"কাছাকাছি", tabExplore:"এক্সপ্লোর", tabChats:"চ্যাট", tabAgent:"আমার এজেন্ট", tabInspiration:"অনুপ্রেরণা", tabCommunities:"কমিউনিটি", tabPlan:"আমার প্ল্যান", tabProfile:"আমার প্রোফাইল",
    agentSub:"দ্রুত জিজ্ঞাসা — লিখুন বা বলুন, স্ক্রল করা লাগবে না", tapToSpeak:"ভয়েস কথোপকথন শুরু করতে ট্যাপ করুন", agentPlaceholder:"Tripo-কে যা খুশি জিজ্ঞাসা করুন…",
    agentGreeting:"হাই! 👋 কোথায় যেতে চান? বেছে নিন, লিখুন বা বলুন।",
    agentActionAskAnything:"যা খুশি জিজ্ঞাসা করুন",
    communitiesSub:"আপনি যে ট্রিপ গ্রুপে আছেন",
    rowPrivacy:"প্রাইভেসি ও ডেটা", rowHelp:"সহায়তা", rowTerms:"ব্যবহারের শর্তাবলি",
    statTrips:"ট্রিপ", statFriends:"বন্ধু", statCountries:"দেশ",
    profileBio:"Tripo-কে আপনার ভ্রমণের ধরন জানান, সে আপনার মতো করে ট্রিপ সাজাবে।",
    editProfile:"প্রোফাইল এডিট করুন", settingsHeading:"সেটিংস",
    friendOnTripo:"Tripo-তে আছেন", friendMsgPlaceholder:"মেসেজ লিখুন",
    chatsTripoSub:"AI ভ্রমণ সহায়ক · চ্যাট করতে ট্যাপ করুন", chatsFriendSub:"হাই বলতে ট্যাপ করুন",
    friendDelivered:"আপাতত শুধু আপনি দেখতে পাচ্ছেন — বন্ধুদের সাথে চ্যাট শিগগিরই আসছে।",
    nearbyLocation:"ঢাকার জনপ্রিয় জায়গা",
    filterAll:"সব", filterStay:"থাকার জায়গা", filterRestaurant:"রেস্টুরেন্ট", filterThings:"দর্শনীয় স্থান", filterExperience:"অভিজ্ঞতা"
  }
};
