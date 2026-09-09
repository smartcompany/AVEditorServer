# AVEditor Server

Next.js API for AVEditor Word Art / text template packs. Deploy on **Vercel**.

## Endpoints

| Path | Description |
|------|-------------|
| `GET /api/health` | Health check |
| `GET /catalog.json` | Pack catalog (Flutter: `{baseUrl}/catalog.json`) |
| `GET /text_packs/catalog.json` | Same catalog (alias) |
| `GET /text_packs/lottie/*.json` | Lottie decorations |
| `GET /api/music/search?q=` | Royalty-free music search (Pixabay / Mixkit) |
| `GET /api/music/file?id=` | Download a track through the server |

## Music catalog (Pixabay / Mixkit)

Tracks are **free for commercial use** and **do not require attribution**.

1. (Optional) Get a free API key at https://pixabay.com/api/docs/ and set:

```text
PIXABAY_API_KEY=your_key
```

2. Redeploy the server

When `PIXABAY_API_KEY` is set, search prefers Pixabay Music (`/api/audio/`).  
Otherwise the server uses **Mixkit** (same license profile) — no key required.

Flutter calls `{baseUrl}/api/music/search` by default (same host as text packs).

## Local dev

```bash
cd server
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

From this folder:

```bash
cd server
npx vercel
```

In the Vercel dashboard, set the project **Root Directory** to `server` if the repo root is the monorepo.

## Flutter client

After deploy, in the app **Settings → Text template server** set:

```text
https://aveditorserver.vercel.app/
```

The Flutter client already defaults to this production URL. Override with:

```bash
flutter run --dart-define=TEXT_PACK_BASE_URL=https://other.vercel.app/
```

## Adding packs

Templates are **server-driven**. Edit the catalog and redeploy the server — **no Flutter app release** is required, as long as the style uses paint features the client already supports (strokes, glow, shadow, line backgrounds including `shape: "brush"`, `preferredFontId`).

1. (Optional) Drop Lottie JSON into `public/text_packs/lottie/`
2. Register the item in `lib/catalog.ts` (`PACK_CATEGORIES`) with a full `style` object
3. Redeploy the server (`npx vercel --prod`)

Keep `style` filled in for every pack — Flutter uses it for preview + export paint parity.

Offline fallback: the Flutter app ships a copy under `client/assets/text_packs/catalog.json`. Remote catalog **wins on merge**, so production updates still apply without an app store release.
