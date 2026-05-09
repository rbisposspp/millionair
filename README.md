# Bobby Millionaire ESL

## What it is
Bobby Millionaire ESL is a game-show-style quiz app for English learning. It uses a 25-question ladder from A1 to C1, multiple-choice gameplay, and optional AI support to create a teacher-led review activity with a strong classroom rhythm.

## Who it is for
This project is built for ESL teachers who want a lively review format for online lessons, classroom warm-ups, or guided practice. It also fits adult learners who benefit from short rounds, visible progression, and clear difficulty levels.

## Main features
- 25-question ladder with A1 to C1 progression
- Multiple-choice gameplay with one wrong answer ending the run
- Three support actions: ask Bobby, skip, and remove one wrong option
- Teacher recap at the end of the session
- Optional AI-generated support through Gemini integration
- Local in-memory mode for running the app without Firestore

## Teaching value
The app turns grammar, vocabulary, functional language, and listening review into a structured speaking-friendly activity. Teachers can use it to recycle language quickly, keep energy high, and end a session with a clear recap of learner performance.

## Tech stack
- Next.js
- React
- TypeScript
- `@google/genai`
- Firestore (optional)

## How to run
Install dependencies and create a local environment file:

```bash
npm install
cp .env.example .env.local
```

Set the required values in `.env.local`, then start the local demo with the in-memory store:

```bash
BOBBY_USE_MEMORY_STORE=1 npm run dev
```

Open `http://localhost:3000`.

## Notes
Persistent storage and media generation are optional. The repository includes `.env.example`, but no private keys or production secrets should be committed.
