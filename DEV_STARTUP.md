# GreenRoute — Local Dev Startup

## Prerequisites

- Node.js 20+
- npm (comes with Node)
- A Supabase project (for auth + database)

---

## 1. Install dependencies

Run this once, or any time `package.json` changes:

```bash
npm install
```

---

## 2. Configure environment variables

The file `.env.local` must exist at the project root with real values filled in.
A template is already committed — open it and replace each placeholder:

```bash
# Open in your editor
code .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console |
| `OPENWEATHERMAP_API_KEY` | openweathermap.org account |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks |
| `RESEND_API_KEY` | resend.com account |
| `NEXT_PUBLIC_APP_URL` | Leave as `http://localhost:3000` for local dev |

---

## 3. Start the dev server

```bash
npm run dev
```

The app will be available at:

```
http://localhost:3000
```

The terminal will show a URL you can `Ctrl+Click` to open directly.

---

## 4. Other useful commands

```bash
# Type-check the project
npx tsc --noEmit

# Lint
npm run lint

# Build for production (verify it compiles)
npm run build
```

---

## Troubleshooting

**Port already in use**
```bash
# Run on a different port
npm run dev -- -p 3001
```

**Module not found / missing packages**
```bash
npm install
```

**Auth not working / Supabase errors**
- Double-check `.env.local` values match your Supabase project
- Make sure `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000`
- In the Supabase dashboard, add `http://localhost:3000` to **Authentication → URL Configuration → Redirect URLs**
