import { Firestore } from "@google-cloud/firestore";

const levelProfiles = {
  A1: {
    grammar: ["be verb", "have got", "like + noun", "there is / there are", "can / cannot"],
    vocabulary: ["family", "school objects", "daily food", "rooms at home", "jobs"],
    speaking: ["introduce yourself", "describe your day", "talk about favorites", "describe your home", "say what you can do"],
    listening: ["a greeting", "a classroom instruction", "a food order", "a simple schedule", "a short self-introduction"],
    functional: ["meet a new friend", "ask for a pencil", "order a snack", "ask where something is", "say what you need"],
    targets: ["I am...", "I have...", "I like...", "There is...", "Can I...?"],
  },
  A2: {
    grammar: ["past simple", "going to", "comparatives", "frequency adverbs", "countable and uncountable nouns"],
    vocabulary: ["travel", "hobbies", "weather", "shopping", "health"],
    speaking: ["talk about yesterday", "make weekend plans", "compare two places", "describe routines", "explain a simple problem"],
    listening: ["a travel plan", "a hobby description", "a weather forecast", "a shop conversation", "a doctor visit"],
    functional: ["buy a ticket", "invite a friend", "ask for prices", "make an appointment", "give directions"],
    targets: ["Yesterday I...", "I am going to...", "It is bigger than...", "I usually...", "How much is...?"],
  },
  B1: {
    grammar: ["present perfect", "first conditional", "modal advice", "relative clauses", "past continuous"],
    vocabulary: ["work", "technology", "environment", "education", "relationships"],
    speaking: ["describe experience", "give advice", "explain an opinion", "tell a story", "solve a problem"],
    listening: ["a job update", "a tech explanation", "an environmental tip", "a school announcement", "a personal story"],
    functional: ["job interview", "make a complaint", "join a project", "negotiate plans", "ask for clarification"],
    targets: ["I have already...", "If we..., we will...", "You should...", "The person who...", "I was ... when..."],
  },
  B2: {
    grammar: ["passive voice", "second conditional", "reported speech", "contrast clauses", "advanced modals"],
    vocabulary: ["career growth", "media", "culture", "finance", "wellbeing"],
    speaking: ["defend a viewpoint", "compare solutions", "summarize a trend", "evaluate a choice", "handle disagreement"],
    listening: ["a workplace update", "a media report", "a cultural review", "a budgeting tip", "a wellbeing podcast"],
    functional: ["present a proposal", "handle feedback", "lead a meeting", "explain a delay", "persuade a customer"],
    targets: ["It is often said that...", "If I were...", "She said that...", "Although...", "It might have been..."],
  },
  C1: {
    grammar: ["inversion", "cleft sentences", "mixed conditionals", "nominalization", "hedging"],
    vocabulary: ["leadership", "ethics", "innovation", "global issues", "strategy"],
    speaking: ["analyze nuance", "challenge an assumption", "synthesize perspectives", "argue diplomatically", "forecast consequences"],
    listening: ["an executive briefing", "an ethics debate", "an innovation pitch", "a global news analysis", "a strategy discussion"],
    functional: ["mediate conflict", "brief stakeholders", "challenge a proposal", "reframe a risk", "negotiate priorities"],
    targets: ["Rarely do we...", "What matters is...", "Had we known...", "The implementation of...", "It appears that..."],
  },
};

const typeOrder = [
  ["grammar", "text"],
  ["vocabulary", "image_text", "image"],
  ["speaking", "text"],
  ["listening", "audio_text", "audio"],
  ["functional", "image_text", "image"],
];

function asset(level, type, index, kind) {
  if (!kind) return undefined;
  const extension = kind === "image" ? "png" : "wav";
  return {
    kind,
    storagePath: `seed/${level.toLowerCase()}/${type}-${index}.${extension}`,
    mimeType: kind === "image" ? "image/png" : "audio/wav",
    durationSeconds: kind === "audio" ? 18 + index * 2 : undefined,
    altText: `${level} ESL ${kind} prompt for ${type} question ${index}`,
  };
}

function promptFor(type, level, focus, topic) {
  if (type === "grammar") return `Use ${focus} to answer one question about ${topic}.`;
  if (type === "vocabulary") return `Look at the picture cue and use one useful word about ${focus} in your answer.`;
  if (type === "speaking") return `Speak for 20-30 seconds: ${focus}.`;
  if (type === "listening") return `Listen to the short audio cue about ${focus}. What important detail did you hear?`;
  if (level === "A1" || level === "A2") return `Roleplay this situation: ${focus}. Use short, clear sentences.`;
  return `Roleplay this situation: ${focus}. Give a clear reason and ask one follow-up question.`;
}

function buildQuestions() {
  const createdAt = new Date().toISOString();
  const questions = [];
  for (const [level, profile] of Object.entries(levelProfiles)) {
    for (const [type, modality, assetKind] of typeOrder) {
      profile[type].forEach((focus, index) => {
        const number = index + 1;
        const target = profile.targets[index] ?? profile.targets[0];
        const topic = type === "grammar" ? focus : profile.vocabulary[index] ?? focus;
        questions.push({
          id: `${level.toLowerCase()}-${type}-${number}`,
          level,
          type,
          modality,
          topic,
          prompt: promptFor(type, level, focus, topic),
          targetLanguage: [target, focus],
          lifelines: {
            starter: target,
            keyword: focus,
            connector: type === "grammar" ? "and" : "because",
          },
          active: true,
          timesUsed: 0,
          asset: asset(level, type, number, assetKind),
          createdAt,
          updatedAt: createdAt,
        });
      });
    }
  }
  return questions;
}

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  databaseId: process.env.FIRESTORE_DATABASE_ID || undefined,
});

const questions = buildQuestions();
const batch = firestore.batch();
for (const question of questions) {
  batch.set(firestore.collection("questions").doc(question.id), question, { merge: true });
}

await batch.commit();
console.log(`Seeded ${questions.length} questions into Firestore.`);
