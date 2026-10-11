# Tripo

AI travel agent website (English + বাংলা), built with Next.js (JavaScript, App Router).

## Run on your computer

1. Install packages (first time only): `npm install`
2. Copy `.env.example` to `.env.local` and paste your Gemini key after `GEMINI_API_KEY=`
   (free key: https://aistudio.google.com → API Keys).
3. Start it: `npm run dev` → open http://localhost:3000

To test the production version locally: `npm run build` then `npm start`.

## Project map

| Path | What it is |
|---|---|
| `app/page.js`, `app/signup` | Landing page and the sign-up chat |
| `app/(app)/…` | The app screens: `/chat`, `/nearby`, `/agent`, `/inspiration`, `/trips`, `/profile` (they share the tab bar in `app/(app)/layout.js`) |
| `app/api/chat/route.js` | AI endpoint (`POST /api/chat`) — calls Google Gemini with the secret key |
| `app/privacy`, `app/terms` | Privacy Policy and Terms of Use pages |
| `app/layout.js`, `app/globals.css` | Fonts, page title, share-preview settings, and all styles |
| `app/manifest.js`, `app/icons`, `app/icon.svg`, `app/apple-icon.js`, `app/opengraph-image.js` | App icons, "Add to home screen", link previews |
| `components/chat` | Chats screen, messages, place / flight / hotel / itinerary cards |
| `components/home`, `components/trips`, `components/profile`, `components/explore` | The other screens |
| `components/shell` | Tab bar, side menu, dialogs (invite, trip picker, trip form), voice screen, toast |
| `components/ui` | Icons and drawn place illustrations |
| `lib/tripo/store.js` | Shared app state: chat, saved items, trips, profile, language |
| `lib/tripo/storage.js` | Where data is kept (the browser today; account sync plugs in here) |
| `lib/tripo/ai.js` | The prompt sent to the AI and reading its reply |
| `lib/tripo/i18n.js`, `content.js` | All interface text (English + বাংলা) and starter content |
| `lib/tripo/travel.js`, `items.js`, `scene.js`, `voice.js`, `plandoc.js` | Booking links, saved-item helpers, illustrations, voice mode, plan download |
| `lib/tripo/config.js` | Site name/description and settings read from environment variables |
| `legacy/tripmate.html` | The original single-file version (reference only, not served) |

## Settings (`.env.local`, and your host's environment variables when deployed)

- `GEMINI_API_KEY` — secret, server only.
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

## Not built yet

- Accounts and a database (expert live chat, friend chat, syncing trips across devices).
  Until then, data lives in each visitor's browser and "talk to a real person" uses WhatsApp.
