# AVEditor Server

Next.js API for AVEditor Word Art / text template packs. Deploy on **Vercel**.

## Endpoints

| Path | Description |
|------|-------------|
| `GET /api/health` | Health check |
| `GET /catalog.json` | Pack catalog (Flutter: `{baseUrl}/catalog.json`) |
| `GET /text_packs/catalog.json` | Same catalog (alias) |
| `GET /text_packs/lottie/*.json` | Lottie decorations |
| `GET /api/music/search?q=` | Royalty-free music search (Jamendo proxy) |
| `GET /api/music/file?id=` | Download a track through the server |

## Music catalog (Jamendo)

1. Create a free client id at https://devportal.jamendo.com  
2. In the Vercel project → **Settings → Environment Variables**, add:

```text
JAMENDO_CLIENT_ID=your_client_id
```

3. Redeploy the server

Flutter calls `{baseUrl}/api/music/search` by default (same host as text packs).  
Alternatively, build the app with `--dart-define=JAMENDO_CLIENT_ID=...` to talk to Jamendo directly.

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

1. Drop Lottie JSON into `public/text_packs/lottie/`
2. Register the item in `lib/catalog.ts` (`PACK_CATEGORIES`) with `lottieUrl: "text_packs/lottie/your.json"`
3. Redeploy

Keep `style` filled in for every pack — Flutter uses it for preview + export paint parity.
