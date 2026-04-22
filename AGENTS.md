# Repository Guidelines

## Project Structure & Module Organization

- `app/` contains the Next.js App Router UI and API routes.
- `lib/` contains shared types, Gemini helpers, Firestore/session storage, media URL resolution, and the generated seed question bank.
- `scripts/seed-questions.mjs` seeds Firestore with 125 CEFR questions.
- `public/` holds static assets when needed.
- `BOBBY_COMPLETE.md` and `instructions.md` remain the source references for Bobby's persona and the Millionaire-style interaction.

## Build, Test, and Development Commands

- `npm install` installs dependencies and updates `package-lock.json`.
- `BOBBY_USE_MEMORY_STORE=1 npm run dev` runs the app locally with the in-memory 125-question bank.
- `npm run typecheck` runs strict TypeScript checks.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.
- `npm run seed:questions` writes the 125-question seed bank to Firestore.

## Coding Style & Naming Conventions

- Use TypeScript with strict types; avoid broad casts and silent fallbacks.
- Keep API route validation explicit and return clear JSON errors.
- Use CEFR names exactly: `A1`, `A2`, `B1`, `B2`, `C1`.
- Use question type names consistently: `grammar`, `vocabulary`, `speaking`, `listening`, `functional`.
- Keep Bobby's instructional tone warm, simple, teacher-led, and ESL-appropriate.

## Testing Guidelines

- Run `npm run typecheck`, `npm run lint`, and `npm run build` after code changes.
- Smoke test `/api/sessions` with `BOBBY_USE_MEMORY_STORE=1` to confirm a 5-question round is selected.
- Verify each CEFR level has at least 25 active questions before deploying with Firestore.
- For media questions, confirm Cloud Storage paths exist or `assetUrl` is intentionally absent for local demos.

## Commit & Pull Request Guidelines

This directory is not currently initialized as a Git repository, so no local commit convention is available.

- Use concise, imperative commit messages once Git is enabled, for example `Add CEFR question bank`.
- Pull requests should describe changed behavior, note Firestore or Cloud Storage setup needs, and include screenshots for UI changes.

## Security & Configuration

- Keep `GEMINI_API_KEY` in Secret Manager for Cloud Run.
- Use `MEDIA_BUCKET` for curated image/audio assets.
- Do not save full student transcripts by default; persist only attempts, language notes, and summaries needed for the teacher.
