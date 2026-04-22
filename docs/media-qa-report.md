# Media QA Report

Date: 2026-04-21

## Scope

QA covered all local seed media under `public/media/seed`: 50 PNG image assets and 25 WAV audio assets used by the seed question bank.

## Result

Status: **Warn - usable for MVP, with recommended cleanup before production.**

The app can find and serve every expected media file. Visual and audio content are broadly aligned with the ESL prompts, but image dimensions differ from the production guideline and two audio clips are shorter than the target duration.

## Technical Inventory

| Check | Result |
| --- | --- |
| Expected files | 75 |
| Found files | 75 |
| Extra files | 0 |
| Images per CEFR level | 10 each for A1, A2, B1, B2, C1 |
| Audio files per CEFR level | 5 each for A1, A2, B1, B2, C1 |
| HTTP asset serving | 75/75 passed via `/media/seed/...` |
| UI image rendering | Passed: A1 image questions rendered with accessible `figure`/`img` |
| UI audio rendering | Passed: A1 listening question rendered an `<audio controls>` element with `readyState: 4` |

## Image QA

All 50 PNG files are valid and loaded successfully in browser contact sheets. The images are classroom-safe and generally match the expected question labels in `docs/media-assets.md`.

Warnings:

- All images are `2816x1536`, not the recommended `1280x720`. This is high quality, but the aspect ratio is not exactly 16:9 and file sizes are larger than needed for Cloud Run delivery.
- `seed/a1/functional-3.png` appears more illustrated than the rest of the realistic set, so the visual style is slightly inconsistent.
- Some B2/C1 images use the light blue, medium pink, and dark purple palette only as subtle accents rather than a strong shared theme.
- The generated `RBS Tech Teach` text should still get a manual close-up pass before production, because small embedded text can be hard to verify in contact-sheet review.

Recommended image fixes:

- Resize/export production variants at `1280x720` or update the guideline if `2816x1536` is intentional.
- Regenerate or accept `seed/a1/functional-3.png` depending on whether mixed illustration/photo style is acceptable.
- Optional: strengthen palette consistency on advanced-level images.

## Audio QA

All 25 WAV files are valid, mono, 24 kHz, 16-bit PCM, and browser-served correctly. Gemini-assisted audio QA marked A1, A2, B1, B2, and C1 as passing for clarity, topic alignment, classroom safety, level fit, and absence of music or sound effects.

Warnings:

- `seed/b2/listening-1.wav` is 8.7 seconds, below the 18-28 second production target.
- `seed/c1/listening-4.wav` is 7.5 seconds, below the 18-28 second production target.
- Most clips are shorter than the target range, typically 10-15 seconds. They are understandable, but they may be too brief for richer listening practice at B2/C1.

Recommended audio fixes:

- Regenerate short clips with prompts that explicitly require 18-28 seconds.
- Prioritize `seed/b2/listening-1.wav` and `seed/c1/listening-4.wav`.
- Keep WAV format unless storage or bandwidth becomes a problem; browser playback worked.

## App Smoke Test

Local command used:

```bash
BOBBY_USE_MEMORY_STORE=1 npm run dev -- --hostname 127.0.0.1 --port 3001
```

Smoke checks passed:

- The landing page loaded and showed `125 seed questions`.
- Session creation worked for A1, A2, B1, B2, and C1.
- Each session selected five unique questions with grammar, vocabulary, speaking, listening, and functional coverage.
- All 75 asset URLs returned successful HTTP responses.
- The only browser console issue observed on the app page was a missing `/favicon.ico`.

## Production Readiness

Media is ready for local MVP testing. Before production, resize images and regenerate the two shortest listening clips. Add a favicon separately if browser console cleanliness matters.
