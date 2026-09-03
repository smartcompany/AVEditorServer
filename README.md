# AVEditor Server

Next.js API for AVEditor Word Art / text template packs. Deploy on **Vercel**.

## Endpoints

| Path | Description |
|------|-------------|
| `GET /api/health` | Health check |
| `GET /catalog.json` | Pack catalog (Flutter: `{baseUrl}/catalog.json`) |
| `GET /text_packs/catalog.json` | Same catalog (alias) |
| `GET /text_packs/lottie/*.json` | Lottie decorations |

The catalog response injects `baseUrl` from the request host so relative `lottieUrl` values resolve on any Vercel deployment URL.

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
https://YOUR_PROJECT.vercel.app/
```

Or launch with:

```bash
flutter run --dart-define=TEXT_PACK_BASE_URL=https://YOUR_PROJECT.vercel.app/
```

## Adding packs

1. Drop Lottie JSON into `public/text_packs/lottie/`
2. Register the item in `lib/catalog.ts` (`PACK_CATEGORIES`) with `lottieUrl: "text_packs/lottie/your.json"`
3. Redeploy

Keep `style` filled in for every pack — Flutter uses it for preview + export paint parity.
