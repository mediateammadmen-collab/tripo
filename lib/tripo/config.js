// Site-wide settings. Fill these in .env.local (and in your host's environment
// variables when you deploy). NEXT_PUBLIC_* values are visible in the browser,
// so never put secret keys here.

export const site = {
  name: "Tripo",
  title: "Tripo — Your AI travel agent",
  description:
    "Plan trips, compare flights on Trip.com and hotels on Booking.com, and get help from a real travel expert — in English and বাংলা.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || "the Tripo team",
};

// Passed to the app in lib/tripo/app.js.
export const siteConfig = {
  AGENT_WHATSAPP: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  BOOKING_AID: process.env.NEXT_PUBLIC_BOOKING_AID || "",
  TRIP_ALLIANCE_ID: process.env.NEXT_PUBLIC_TRIP_ALLIANCE_ID || "",
  TRIP_SID: process.env.NEXT_PUBLIC_TRIP_SID || "",
};
