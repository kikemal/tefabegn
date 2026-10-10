# Tefabign Frontend

Welcome page and UI shell for ጠፋብኝ (Tefabign).

## Stack

- React 19 + TypeScript
- Vite 6 (dev server port **5173**, aligned with backend `CORS_ORIGINS`)
- React Router
- lucide-react icons

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Theme (light / dark)

- Brand colors: forest `#123C32`, ivory `#F5EBDD`; dark surfaces use `#102720` and related greens.
- First visit: follows `prefers-color-scheme`, with **light** as fallback.
- Explicit choice: sun/moon toggle in the header; persisted in `localStorage` (`tefabign.theme`).
- Flash prevention: `public/theme-init.js` runs before the app bundle.

## i18n

- Default locale: **English** (`en`)
- Amharic: **አማ** (`am`) via header language toggle
- Preference stored in `localStorage` key `tefabign.locale`

Translations: `src/i18n/en.ts`, `src/i18n/am.ts`.

## Routes

| Path | Status |
| --- | --- |
| `/` | Welcome page (implemented) |
| `/sign-in` | Login page (English-only glass card; wired to `POST /api/auth/login`) |
| `/register` | Registration page (wired to `POST /api/auth/register`) |
| `/forgot-password` | Info only — backend v1 has no password-reset API |
| `/dashboard` | Student dashboard (auth required) |
| `/browse` | Browse/search public-safe reports (auth required) |
| `/report` | Create lost/found report forms (auth required) |
| `/my-reports` | Own lost/found reports (auth required) |
| `/account` | Profile, language, theme, sign-out |
| `/help` | Help & support |
| `/items/:type/:id` | Report detail |
| `/about` | Public about placeholder |

Google sign-in is **not** shown: the backend has no OAuth/Google integration.

## Recently found preview data

`src/data/mockFoundItems.ts` — public-safe mock cards only. Replace with `GET /reports/search` (found, public fields) when wired to the backend.

## API proxy (optional)

Vite proxies `/api/*` → `http://localhost:3000` (see `vite.config.ts`).
