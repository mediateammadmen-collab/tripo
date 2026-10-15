# Tripo

AI travel agent website (English + বাংলা), built with Next.js (JavaScript, App Router).

## What it does

- **Chat with a live map** — Tripo's suggestions appear as cards with real photos and as pins on a map;
  itineraries show each day's stops and route.
- **Explore** — a guide to any city: things to do, places to eat and stay, with weather.
- **Trips** — day-by-day editor, calendar, bookings read from uploaded tickets/receipts, download.
- **Sharing** — a read-only link for anyone, or "plan together" for signed-in friends.
- **Accounts** — email + password; trips, saved places and chats sync across devices. Guests can use
  everything except sharing, with data kept in their browser.
- **Live voice** — talk to Tripo out loud (OpenAI Realtime); places and plans appear on screen while it talks.
- Flight and hotel search links (Trip.com, Booking.com), English + বাংলা.

## Run on your computer

1. Install packages (first time only): `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (Gemini key, Supabase URL and keys).
3. **One time:** open `supabase/schema.sql`, copy all of it, and run it in Supabase → SQL Editor.
   Until this is done, sign-in works but nothing is saved to accounts and sharing is off.
4. Start it: `npm run dev` → open http://localhost:3000

To test the production version locally: `npm run build` then `npm start`.

### Supabase sign-in settings

In Supabase → Authentication → URL Configuration, set **Site URL** to your live address and add
`http://localhost:3000/**` and `https://your-live-address/**` to **Redirect URLs** (used by the
"confirm your email" and "reset password" links). New accounts must confirm their email unless you
turn "Confirm email" off under Authentication → Sign In / Providers → Email. Supabase's built-in
email sender only allows a few emails per hour; connect your own SMTP service before launch.

## Project map

| Path | What it is |
|---|---|
| `app/page.js`, `app/signup`, `app/login` | Landing page, travel-style questions, sign in / create account |
| `app/(app)/…` | The app screens: `/chat`, `/explore`, `/agent`, `/inspiration`, `/trips`, `/profile` |
| `app/t/[shareId]` | Public page for a shared trip |
| `app/api/chat` | AI chat (OpenAI, Gemini as backup — see `lib/server/ai.js`) |
| `app/api/voice/session` | Starts a live voice conversation (short-lived OpenAI Realtime key) |
| `app/api/places` | Finds a place's location, photo and description (Wikipedia + OpenStreetMap) |
| `app/api/explore` | City guide: AI-picked sights, food and stays, placed on the map, plus weather |
| `app/api/receipt` | Reads an uploaded ticket or receipt with the AI |
| `app/privacy`, `app/terms` | Privacy Policy and Terms of Use |
| `components/chat`, `components/map` | Chats screen, cards, and the MapLibre map |
| `components/trips` | Trips list, day-by-day editor, calendar, receipts, shared-trip page |
| `components/explore`, `components/home`, `components/profile`, `components/account` | The other screens |
| `components/shell` | Tab bar, side menu, dialogs (trip picker, trip form, place details, share), voice, toast |
| `lib/tripo/store.js` | Shared app state and all actions (chat, trips, accounts, sync) |
| `lib/tripo/storage.js`, `cloud.js` | Browser storage and account sync (Supabase) |
| `lib/tripo/trips.js`, `places.js`, `items.js` | Trip model, map look-up keys, saved-item helpers |
| `lib/tripo/ai.js`, `i18n.js`, `content.js` | AI prompt, interface text (English + বাংলা), starter content |
| `lib/server/ai.js` | One connection for all AI requests: OpenAI first, Gemini backup |
| `lib/server/places.js`, `ratelimit.js` | Server-side place look-up with caching; request limiter |
| `lib/tripo/voice.js`, `voice-browser.js` | Live voice (WebRTC + tools that show cards), and the free browser-voice fallback |
| `lib/supabase/client.js`, `admin.js` | Browser and server connections to Supabase |
| `supabase/schema.sql` | Database tables and security rules — run once in Supabase |
| `scripts/copy-map-worker.mjs` | Copies the map library's worker file into `public/vendor` on install |
| `legacy/tripmate.html` | The original single-file version (reference only, not served) |

## Settings (`.env.local`, and your host's environment variables when deployed)

- `OPENAI_API_KEY` (or `CHATGPT_API_KEY`) — secret, server only. Powers chat, guides, receipts and live voice.
  Optional: `OPENAI_MODEL` (default `gpt-5.4-mini`), `OPENAI_REALTIME_MODEL` (default `gpt-realtime-2.1`),
  `OPENAI_VOICE` (default `marin`).
- `GEMINI_API_KEY` — secret, server only. Free backup when OpenAI is busy; `AI_PROVIDER=gemini` makes it primary.
- `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` — which Gemini models to use (default: Flash-Lite, with Flash
  as backup). The backup is used automatically when the main model is busy or takes over 20 seconds.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — Supabase project
  (accounts and database; the secret key is server only).
- `NEXT_PUBLIC_SITE_URL` — your live address (used for link previews).
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — shows WhatsApp buttons for "talk to a real person".
- `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_OPERATOR_NAME` — shown on the Privacy and Terms pages.
- `NEXT_PUBLIC_BOOKING_AID`, `NEXT_PUBLIC_TRIP_ALLIANCE_ID`, `NEXT_PUBLIC_TRIP_SID` — affiliate IDs.

`NEXT_PUBLIC_*` values are visible in the browser; never put secrets in them.
After changing `.env.local`, restart `npm run dev`.

## Publish to Netlify

1. Put the project on GitHub (`.env.local` is ignored and stays private).
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   Netlify detects Next.js automatically.
3. In **Site configuration → Environment variables**, add `GEMINI_API_KEY` and any settings above
   (set `NEXT_PUBLIC_SITE_URL` to your Netlify address).
4. Deploy.

## Free services Tripo relies on

OpenAI (paid, per use — set a monthly limit in your OpenAI billing settings), Gemini free tier (backup AI), Supabase free tier (accounts, database), OpenFreeMap (map tiles),
Wikipedia and Photon/OpenStreetMap (place look-up), Open-Meteo (weather). All have fair-use limits;
place and city-guide results are cached in the database to stay well within them.

## Not built yet

- Community guides and creator profiles, background "agents" (price watch), in-app chat with a human
  expert (currently WhatsApp), Google sign-in.
