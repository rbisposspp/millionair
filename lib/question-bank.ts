import type { CEFRLevel, Question, QuestionModality, QuestionOption, QuestionType } from "./types";

type PromptSeed = {
  type: QuestionType;
  modality: QuestionModality;
  focus: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  targetLanguage: string[];
  assetKind?: "image" | "audio";
};

type LevelProfile = {
  targets: string[];
  seeds: PromptSeed[];
};

type QuestionSeed = Omit<Question, "active" | "timesUsed">;

const optionLabels = ["A", "B", "C", "D"] as const;
const levelOrder: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1"];

const levelProfiles: Record<CEFRLevel, LevelProfile> = {
  A1: {
    targets: ["I am...", "I have...", "I like...", "There is...", "Can I...?"],
    seeds: [
      {
        type: "grammar",
        modality: "text",
        focus: "be verb",
        prompt: 'Choose the best sentence to complete: "My teacher ___ very kind."',
        options: ["am", "is", "are", "be"],
        correctIndex: 1,
        explanation: 'We use "is" with the singular subject "teacher".',
        targetLanguage: ["My teacher is very kind.", "be verb"],
      },
      {
        type: "vocabulary",
        modality: "image_text",
        focus: "school objects",
        prompt: "You want to write on the board. Which school object do you need?",
        options: ["A ruler", "A pencil", "A crayon", "A notebook"],
        correctIndex: 1,
        explanation: "A pencil is the best match for writing.",
        targetLanguage: ["pencil", "school objects"],
        assetKind: "image",
      },
      {
        type: "speaking",
        modality: "text",
        focus: "favorites",
        prompt: 'A friend asks, "What food do you like?" Which answer sounds best?',
        options: ["I like pizza.", "Pizza like I.", "I am like pizza.", "Like pizza me."],
        correctIndex: 0,
        explanation: 'The natural A1 answer is "I like pizza."',
        targetLanguage: ["I like pizza.", "talk about favorites"],
      },
      {
        type: "listening",
        modality: "audio_text",
        focus: "a greeting",
        prompt: 'You hear: "Hello, I am Sara from Brazil." What is Sara\'s country?',
        options: ["Brazil", "Spain", "Canada", "Japan"],
        correctIndex: 0,
        explanation: "Sara says she is from Brazil.",
        targetLanguage: ["Brazil", "a greeting"],
        assetKind: "audio",
      },
      {
        type: "functional",
        modality: "image_text",
        focus: "ask for a pencil",
        prompt: "You need a pencil in class. What should you say?",
        options: [
          "Can I borrow a pencil, please?",
          "Borrow pencil now.",
          "Give me pencil.",
          "I pencil need.",
        ],
        correctIndex: 0,
        explanation: "This is the polite classroom request.",
        targetLanguage: ["Can I borrow a pencil, please?", "ask for a pencil"],
        assetKind: "image",
      },
    ],
  },
  A2: {
    targets: ["Yesterday I...", "I am going to...", "It is bigger than...", "I usually...", "How much is...?"],
    seeds: [
      {
        type: "grammar",
        modality: "text",
        focus: "past simple",
        prompt: 'Choose the best sentence: "Yesterday, we ___ to the park."',
        options: ["go", "went", "going", "gone"],
        correctIndex: 1,
        explanation: 'Past simple of "go" is "went".',
        targetLanguage: ["Yesterday, we went to the park.", "past simple"],
      },
      {
        type: "vocabulary",
        modality: "image_text",
        focus: "travel",
        prompt: "Which word matches a place where planes arrive and leave?",
        options: ["Station", "Airport", "Bridge", "Market"],
        correctIndex: 1,
        explanation: "Planes use an airport.",
        targetLanguage: ["airport", "travel"],
        assetKind: "image",
      },
      {
        type: "speaking",
        modality: "text",
        focus: "make weekend plans",
        prompt: 'Your friend asks about Saturday. Which answer sounds best?',
        options: [
          "I am going to visit my cousin.",
          "I going visit my cousin.",
          "I am visit my cousin.",
          "I to visit my cousin.",
        ],
        correctIndex: 0,
        explanation: 'The full future plan is "I am going to visit my cousin."',
        targetLanguage: ["I am going to visit my cousin.", "make weekend plans"],
      },
      {
        type: "listening",
        modality: "audio_text",
        focus: "a weather forecast",
        prompt: 'You hear: "It will be rainy in the morning and sunny after lunch." What is the weather after lunch?',
        options: ["Windy", "Rainy", "Sunny", "Snowy"],
        correctIndex: 2,
        explanation: "The forecast says sunny after lunch.",
        targetLanguage: ["sunny", "a weather forecast"],
        assetKind: "audio",
      },
      {
        type: "functional",
        modality: "image_text",
        focus: "ask for prices",
        prompt: "You are in a shop. What is the best question?",
        options: [
          "How much is this T-shirt?",
          "How many price this?",
          "What cost this T-shirt?",
          "This T-shirt how much are?",
        ],
        correctIndex: 0,
        explanation: "This is the natural shopping question.",
        targetLanguage: ["How much is this T-shirt?", "ask for prices"],
        assetKind: "image",
      },
    ],
  },
  B1: {
    targets: ["I have already...", "If we..., we will...", "You should...", "The person who...", "I was ... when..."],
    seeds: [
      {
        type: "grammar",
        modality: "text",
        focus: "present perfect",
        prompt: 'Choose the best sentence: "I ___ my homework already."',
        options: ["finished", "have finished", "am finishing", "finish"],
        correctIndex: 1,
        explanation: 'Present perfect with "already" is "have finished".',
        targetLanguage: ["I have finished my homework already.", "present perfect"],
      },
      {
        type: "vocabulary",
        modality: "image_text",
        focus: "technology",
        prompt: "Which word best matches software that protects a computer?",
        options: ["Keyboard", "Battery", "Antivirus", "Headphones"],
        correctIndex: 2,
        explanation: "Antivirus software protects a computer from malware.",
        targetLanguage: ["antivirus", "technology"],
        assetKind: "image",
      },
      {
        type: "speaking",
        modality: "text",
        focus: "give advice",
        prompt: "A friend feels stressed before exams. Which advice is best?",
        options: [
          "You should take short breaks and sleep well.",
          "You must to sleep later every night.",
          "You should not studying at all.",
          "You are should relax tomorrow.",
        ],
        correctIndex: 0,
        explanation: 'The modal advice pattern is "You should..."',
        targetLanguage: ["You should take short breaks and sleep well.", "give advice"],
      },
      {
        type: "listening",
        modality: "audio_text",
        focus: "a job update",
        prompt: 'You hear: "Our team has already finished the report, so we can send it this afternoon." What has the team finished?',
        options: ["The meeting", "The report", "The budget", "The training"],
        correctIndex: 1,
        explanation: "The audio says the team finished the report.",
        targetLanguage: ["the report", "a job update"],
        assetKind: "audio",
      },
      {
        type: "functional",
        modality: "image_text",
        focus: "job interview",
        prompt: "In a job interview, which answer sounds strongest?",
        options: [
          "I have three years of customer service experience.",
          "Experience I have with customer service.",
          "Customer service is my experience have.",
          "I am work customer service three years.",
        ],
        correctIndex: 0,
        explanation: "This answer is clear, natural, and professional.",
        targetLanguage: ["I have three years of customer service experience.", "job interview"],
        assetKind: "image",
      },
    ],
  },
  B2: {
    targets: ["It is often said that...", "If I were...", "She said that...", "Although...", "It might have been..."],
    seeds: [
      {
        type: "grammar",
        modality: "text",
        focus: "reported speech",
        prompt: 'Choose the best reported sentence: "Mia said, \'I need more time.\'"',
        options: [
          "Mia said that she needed more time.",
          "Mia said she need more time.",
          "Mia said that I need more time.",
          "Mia said needing more time.",
        ],
        correctIndex: 0,
        explanation: "Reported speech shifts to 'needed' here.",
        targetLanguage: ["Mia said that she needed more time.", "reported speech"],
      },
      {
        type: "vocabulary",
        modality: "image_text",
        focus: "finance",
        prompt: "Which word means money set aside for future needs?",
        options: ["Debt", "Budget", "Savings", "Receipt"],
        correctIndex: 2,
        explanation: "Savings are money kept for future use.",
        targetLanguage: ["savings", "finance"],
        assetKind: "image",
      },
      {
        type: "speaking",
        modality: "text",
        focus: "handle disagreement",
        prompt: "Which response shows polite disagreement in a meeting?",
        options: [
          "I see your point, although I would suggest a different approach.",
          "You are wrong, and this idea is bad.",
          "No, impossible, next topic.",
          "I no agree because no.",
        ],
        correctIndex: 0,
        explanation: "This response is diplomatic and clear.",
        targetLanguage: ["Although I would suggest a different approach.", "handle disagreement"],
      },
      {
        type: "listening",
        modality: "audio_text",
        focus: "a media report",
        prompt: 'You hear: "Sales rose slightly in April, but they dropped sharply in May." What happened in May?',
        options: ["Sales stayed the same", "Sales dropped sharply", "Sales rose quickly", "Sales ended"],
        correctIndex: 1,
        explanation: "The report says sales dropped sharply in May.",
        targetLanguage: ["Sales dropped sharply in May.", "a media report"],
        assetKind: "audio",
      },
      {
        type: "functional",
        modality: "image_text",
        focus: "present a proposal",
        prompt: "Which sentence best introduces a proposal to a client?",
        options: [
          "I would like to outline a solution that could reduce delivery delays.",
          "My proposal maybe okay, I think.",
          "Listen, this is the only plan.",
          "We do proposal for delays reduce.",
        ],
        correctIndex: 0,
        explanation: "This opener is confident and professional.",
        targetLanguage: ["I would like to outline a solution...", "present a proposal"],
        assetKind: "image",
      },
    ],
  },
  C1: {
    targets: ["Rarely do we...", "What matters is...", "Had we known...", "The implementation of...", "It appears that..."],
    seeds: [
      {
        type: "grammar",
        modality: "text",
        focus: "inversion",
        prompt: "Choose the most advanced and correct sentence.",
        options: [
          "Rarely do we see such a well-prepared team.",
          "Rarely we see such a well-prepared team.",
          "We rarely do see such a well-prepared team.",
          "Do we rarely see such a well-prepared team.",
        ],
        correctIndex: 0,
        explanation: "After 'rarely', inversion is required in this formal structure.",
        targetLanguage: ["Rarely do we see...", "inversion"],
      },
      {
        type: "vocabulary",
        modality: "image_text",
        focus: "strategy",
        prompt: "Which word best describes a carefully designed long-term plan?",
        options: ["Outcome", "Strategy", "Shortcut", "Routine"],
        correctIndex: 1,
        explanation: "A strategy is a long-term plan designed to achieve a goal.",
        targetLanguage: ["strategy", "strategy"],
        assetKind: "image",
      },
      {
        type: "speaking",
        modality: "text",
        focus: "challenge an assumption",
        prompt: "Which answer challenges an assumption diplomatically?",
        options: [
          "It appears that we may be overlooking a key risk in that assumption.",
          "That assumption is ridiculous.",
          "No, obviously not.",
          "You assume wrong. End.",
        ],
        correctIndex: 0,
        explanation: "This phrasing is diplomatic, analytical, and C1-appropriate.",
        targetLanguage: ["It appears that we may be overlooking...", "challenge an assumption"],
      },
      {
        type: "listening",
        modality: "audio_text",
        focus: "an executive briefing",
        prompt: 'You hear: "Had we known the market would shift so quickly, we would have diversified sooner." What does the speaker regret?',
        options: [
          "Hiring too many staff",
          "Diversifying too soon",
          "Not diversifying sooner",
          "Ignoring a meeting",
        ],
        correctIndex: 2,
        explanation: "The speaker regrets not diversifying sooner.",
        targetLanguage: ["not diversifying sooner", "an executive briefing"],
        assetKind: "audio",
      },
      {
        type: "functional",
        modality: "image_text",
        focus: "brief stakeholders",
        prompt: "Which sentence best briefs stakeholders about a complex issue?",
        options: [
          "What matters is that the rollout remains stable while we address the final compliance gap.",
          "Everything is complicated, but okay maybe.",
          "There is a gap, so things are bad.",
          "Stakeholders need know issue now.",
        ],
        correctIndex: 0,
        explanation: "This is concise, strategic, and precise.",
        targetLanguage: ["What matters is that the rollout remains stable...", "brief stakeholders"],
        assetKind: "image",
      },
    ],
  },
};

function makeAsset(
  level: CEFRLevel,
  type: QuestionType,
  index: number,
  kind?: "image" | "audio",
) {
  if (!kind) {
    return undefined;
  }

  const extension = kind === "image" ? "png" : "wav";
  return {
    kind,
    storagePath: `seed/${level.toLowerCase()}/${type}-${index}.${extension}`,
    mimeType: kind === "image" ? "image/png" : "audio/wav",
    durationSeconds: kind === "audio" ? 12 + index * 2 : undefined,
    altText:
      kind === "image"
        ? `${level} multiple-choice visual cue for ${type} question ${index}`
        : `${level} multiple-choice listening cue for ${type} question ${index}`,
  };
}

function buildOptions(options: PromptSeed["options"]): QuestionOption[] {
  return options.map((text, index) => ({
    id: `option-${optionLabels[index].toLowerCase()}`,
    label: optionLabels[index],
    text,
  }));
}

export function buildSeedQuestions(): Question[] {
  const createdAt = "2026-04-21T00:00:00.000Z";
  const questions: QuestionSeed[] = [];

  levelOrder.forEach((level) => {
    const profile = levelProfiles[level];
    profile.seeds.forEach((seed, index) => {
      const options = buildOptions(seed.options);
      const correctOption = options[seed.correctIndex];
      questions.push({
        id: `${level.toLowerCase()}-${seed.type}-${index + 1}`,
        level,
        type: seed.type,
        modality: seed.modality,
        topic: seed.focus,
        prompt: seed.prompt,
        options,
        correctOptionId: correctOption.id,
        explanation: seed.explanation,
        targetLanguage: seed.targetLanguage,
        lifelines: {
          fiftyFifty: "Remove one wrong answer.",
          bobby: "Ask Bobby for a hunch.",
          skip: "Skip this question and count it as passed.",
        },
        asset: makeAsset(level, seed.type, index + 1, seed.assetKind),
        createdAt,
        updatedAt: createdAt,
      });
    });
  });

  return questions.map((question) => ({
    ...question,
    active: true,
    timesUsed: 0,
  }));
}

export const seedQuestions = buildSeedQuestions();

export function getSeedQuestion(id: string): Question | undefined {
  return seedQuestions.find((question) => question.id === id);
}
