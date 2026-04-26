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

From Git Bash:

```bash
npm run dev
```

The app will be available at:

```
http://localhost:3000
```

The terminal will show a URL you can `Ctrl+Click` to open directly.

---

## 4. Stop the dev server

If the dev server is running in the current terminal, press:

```bash
Ctrl+C
```

If the server is stuck in the background, Next will show the PID:

```text
Run taskkill /PID 34300 /F to stop it.
```

In Git Bash, use double slashes so Windows receives the flags correctly:

```bash
taskkill //PID 34300 //F
```

Replace `34300` with the PID shown in your terminal.

You can also stop the process currently using port 3000:

```bash
npx kill-port 3000
```

---

## 5. Restart the dev server

Stop the existing server first, then run:

```bash
npm run dev
```

If port 3000 is still busy, Next may start on `http://localhost:3001`. Stop the process using port 3000 if you want the app back on the default URL.

---

## 6. Other useful commands

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
