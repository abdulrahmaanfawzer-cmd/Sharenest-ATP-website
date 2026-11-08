# Sharenest — Community Borrowing Platform (static edition)

Same prototype, rebuilt as **plain HTML, CSS and JavaScript**. No React, no Vite, no Node.js, no build step.

## Run

Double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

## Deploy to Cloudflare Pages

Direct upload, or connect the repo with:

- **Framework preset:** None
- **Build command:** *(leave empty)*
- **Build output directory:** `/` (repo root, or the folder holding `index.html`)

Works the same on Netlify, GitHub Pages, S3, nginx — anything that serves static files.

## Files

```text
index.html    # markup shell, loads the three scripts
styles.css    # original responsive layout (unchanged)
themes.css    # six themes + color picker styles (unchanged)
icons.js      # inlined Lucide icon paths + ic() helper (replaces lucide-react)
data.js       # demo requests, categories, loans
app.js        # all UI and interactions (replaces main.jsx)
logo-mark.png # Sharenest emblem, used in the sidebar brand lockup
logo.png      # full Sharenest lockup (emblem + wordmark), used for og:image
favicon.png   # 256x256 favicon / apple-touch-icon
```

## What changed from the React version

- `main.jsx` → `app.js`: component functions return HTML strings; a `state` object plus `render()` replaces `useState`/`useMemo`; `document` click/input/submit delegation replaces JSX handlers.
- `lucide-react` → `icons.js`: the 28 icons used are inlined as SVG path data, rendered by `ic(name, size, class, extra)`.
- ES module `import`/`export` → plain `<script>` globals, so `file://` works too.
- Typing in search re-renders only the results block, so the field keeps focus.
- `package.json`, `package-lock.json` and the Vite toolchain are gone.

Behaviour, markup classes, themes and `localStorage` keys (`sharenest_demo_v1`, `sharenest_color_theme_v1`) are identical, so existing saved themes and demo data carry over.

## Prototype boundaries

Unchanged: invented demo profiles, browser `localStorage` only. No real authentication, verification, messaging, payments, notifications, uploads, database or API. The admin panel is illustrative. Member and borrowing counts are fictional. `localStorage` is not secure storage.

## Supabase backend (connected)

This site now reads and writes the "requests" board from Supabase instead of only `localStorage`.

**Setup:**

1. In your Supabase project, open **SQL Editor > New query**, paste the contents of `schema.sql`, and run it. This creates the `requests` table, demo RLS policies, and seeds the same 6 demo rows.
2. Open **Project Settings > API** (or the **Connect** button) and copy your **Project URL** and **anon / publishable key**.
3. Paste them into `config.js`:
   ```js
   var SHARENEST_SUPABASE_URL = 'https://xxxxx.supabase.co';
   var SHARENEST_SUPABASE_KEY = 'eyJ...';
   ```
4. Open `index.html` (or redeploy to Cloudflare Pages). On load, the app fetches requests from Supabase; if `config.js` is still left as placeholders or the fetch fails, it quietly falls back to the local demo data, so the site never breaks.

**How it works:**

- `supabaseClient.js` creates `window.sharenestSupabase` from `config.js`, using the Supabase CDN bundle (no npm/build step needed).
- `loadFromSupabase()` (in `app.js`) runs once on startup and replaces the local demo requests with live rows from the `requests` table, mapped back into the same shape the UI already expects.
- `submitRequest()` still updates the UI instantly (optimistic update), then inserts the new row into Supabase in the background and reconciles the real database `id`.
- The current RLS policies in `schema.sql` are intentionally open (anyone can read/insert) to match this prototype's "no real auth yet" state. **Before this goes near real users**, add Supabase Auth and tighten the policies so inserts/updates are scoped to an authenticated `user_id`.
- Loans, likes, themes, and the admin panel are still local-only — `schema.sql` only covers the requests board. Extend the same pattern (a table + a couple of `sharenestSupabase.from(...)` calls) for those when you're ready.

## Adding a backend later

Static hosting still works — call an API from `app.js` with `fetch`. On Cloudflare, Pages Functions (`/functions`) or a Worker gives you server-side code without a Node.js server. Verify membership and authorization on every server request; never trust a community ID sent by the frontend.
