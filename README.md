# FitChallenge App

Built according to the `FitChallenge_PRD.md`.

## Aesthetic & Stack
- **Framework:** React + Vite (TypeScript)
- **Styling:** Custom Vanilla CSS for Peloton / Apple Glassmorphism (dark background `#080B14`, frosted glass panels).
- **Backend:** Setup for Supabase Auth and Database via `src/lib/supabase.ts` (currently with mock environment variables).

## Running Locally
1. `npm install`
2. `npm run dev`

Navigate to `http://localhost:5173/` inside your browser to see the Login and Dashboard views.

## Next Steps
- Establish real Supabase connection (provide your `.env` variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- Setup Map Challenges and Admin Panels logic according to Phase 1-2.
