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

## i18n

- Default locale: **English** (`en`)
- Amharic: **አማ** (`am`) via header language toggle
- Preference stored in `localStorage` key `tefabign.locale`

Translations: `src/i18n/en.ts`, `src/i18n/am.ts`.

## Routes

| Path | Status |
| --- | --- |
| `/` | Welcome page (implemented) |
| `/browse`, `/my-reports`, `/about`, `/sign-in` | Placeholder until integration |
| `/reports/lost`, `/reports/found` | Placeholder reporting routes |
| `/items/:id` | Placeholder public item detail |

## Recently found preview data

`src/data/mockFoundItems.ts` — public-safe mock cards only. Replace with `GET /reports/search` (found, public fields) when wired to the backend.

## API proxy (optional)

Vite proxies `/api/*` → `http://localhost:3000` (see `vite.config.ts`).
