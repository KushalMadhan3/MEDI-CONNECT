# Deploying the Medi-Connect Backend (Option 1)

Goal: run your Express + MongoDB backend as a **persistent web service** (Render),
then point the frontend (Vercel) at it by setting one environment variable.

Your frontend is already ready — all API calls now read from `VITE_API_URL` via
`utils/config.ts`. You only need to **deploy the backend** and **set that one env var**
when the frontend builds.

---

## Part 1 — MongoDB Atlas (the database)

Your backend requires MongoDB to boot (`server/server.js` throws if it can't connect,
so set this up first).

1. Go to https://www.mongodb.com/cloud/atlas and sign up / log in (free tier).
2. **Create a cluster** (the free `M0` shared cluster is fine).
3. In Security → **Database Access** → Add New Database User.
   - Username / password of your choice (choose "Read and write to any database").
   - Copy these — you'll need them for the connection string.
4. In Security → **Network Access** → Add IP Address. To allow the Render service
   from anywhere, click **Allow access from anywhere** (`0.0.0.0/0`). *(Fine for a demo.)*
5. Cluster → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with the database user you created.

---

## Part 2 — Render (the backend)

Render runs your Express app as a long-running web service (uses `server/server.js`).

1. Push your repo to GitHub (e.g. your `KushalMadhan3/KushalMadhan3-MEDI-CONNECT` repo).
2. Go to https://render.com → **New** → **Web Service**.
3. **Connect your repository** and select the repo.
4. Render should auto-detect. If not, set:
   - **Name:** `medi-connect-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`  *(runs `node server/server.js` — see package.json)*
5. Expand **Environment** and add these variables:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Your Atlas connection string from Part 1 (step 5) |
   | `JWT_SECRET` | A long random string (e.g. 32+ random characters) |
   | `CLIENT_URL` | `https://medi-connect-tau-teal.vercel.app`  ← your deployed frontend origin |
   | `NODE_ENV` | `production` |
   | `PORT` | (optional, Render injects its own) |
   | `OPENAI_API_KEY` | *(optional)* enables AI-powered doctor matching |
   | `OPENAI_MODEL` | `gpt-4o-mini` (optional default) |

6. Click **Create Web Service** and wait for the deploy to finish.
7. On the Render dashboard, your service gets a URL like:
   ```
   https://medi-connect-api.onrender.com
   ```
   **Test it:** open `https://medi-connect-api.onrender.com/health` in a browser.
   You should see JSON with `"status": "ok"`.

> Optional extras (Redis, RabbitMQ, Elasticsearch) are **not required** to boot —
> the server logs warnings and falls back gracefully when they're absent.

---

## Part 3 — Point the frontend (Vercel) at the backend

Backend URL = your Render URL **origin only** (no `/api`):

```
https://medi-connect-api.onrender.com
```

1. In your Vercel project (`medi-connect-tau-teal`) → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://medi-connect-api.onrender.com`
3. Trigger a **redeploy** (Deployments → latest → ⋯ → Redeploy, or push a commit).
4. Load the site. Login / browsing / checkout now calls your live backend instead of
   `localhost:3001`.

---

## Local development stays unchanged

With `VITE_API_URL` **unset** locally, everything falls back to
`http://localhost:3001` (via `utils/config.ts`), so the dev workflow
(`npm run dev` + `npm run server`) is exactly as before. No code changes needed.

---

## Troubleshooting

- **404 on `/api/health` at the Vercel URL** — expected; Vercel only hosts the frontend.
  The backend lives at your Render `/health` URL instead.
- **CORS errors in the browser** — make sure `CLIENT_URL` on Render is exactly your
  Vercel origin (no trailing slash) and matches where the site is actually served.
- **Backend won't boot** — Render logs will usually say `MongoDB connection failed`.
  Double-check `MONGODB_URI`, the Atlas user password, and Network Access (0.0.0.0/0).
- **Login works locally but not live** — confirm the frontend redeployed and that
  `JWT_SECRET` is set on Render so tokens are created consistently.
