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
| `app/page.js` | Home page — mounts the Tripo app |
| `app/api/chat/route.js` | AI endpoint (`POST /api/chat`) — calls Google Gemini with the secret key |
| `app/privacy`, `app/terms` | Privacy Policy and Terms of Use pages |
| `app/layout.js` | Fonts, page title, description, share-preview settings |
| `app/globals.css` | All styles |
| `app/manifest.js`, `app/icons`, `app/icon.svg`, `app/apple-icon.js`, `app/opengraph-image.js` | App icons, "Add to home screen", link previews |
| `components/TripoApp.js` | Puts the app on the page and starts it |
| `lib/tripo/app.js` | The app logic: chat, AI cards, saved trips, profile, voice |
| `lib/tripo/markup.js` | The app's screens and menus |
| `lib/tripo/config.js` | Site name/description and settings read from environment variables |
| `legacy/tripmate.html` | The original single-file version (reference only, not served) |

## Settings (`.env.local`, and your host's environment variables when deployed)

- `GEMINI_API_KEY` — secret, server only.
- `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` — which Gemini models to use. The fallback is used
  automatically when the main model is busy.
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
