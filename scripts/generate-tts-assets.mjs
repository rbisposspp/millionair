import { GoogleGenAI } from "@google/genai";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const wav = require("wav");

const promptFile = "docs/tts-generation-prompts.md";
const outputRoot = "public/media";
const model = "gemini-2.5-pro-preview-tts";
const batchSize = 5;
const delayMs = 30_000;
const defaultProject = "noble-velocity-492304-b6";
const defaultLocation = "us-central1";

async function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = await readFile(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrompts(markdown) {
  const sections = markdown.split(/^### `/m).slice(1);
  return sections.map((section) => {
    const [titleLine, ...bodyLines] = section.split("\n");
    const storagePath = titleLine.replace(/`/g, "").trim();
    const script = bodyLines.join("\n").replace(/^TTS script:\s*/i, "").trim();
    return { storagePath, script };
  });
}

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    args.set(key, value);
  }

  return {
    start: Number(args.get("start") ?? 0),
    limit: args.has("limit") ? Number(args.get("limit")) : undefined,
    overwrite: args.get("overwrite") === "true",
  };
}

function voiceFor(storagePath) {
  if (storagePath.includes("/a1/") || storagePath.includes("/a2/")) {
    return "Achird";
  }

  if (storagePath.includes("/b1/")) {
    return "Sulafat";
  }

  return "Gacrux";
}

function styleFor(storagePath) {
  if (storagePath.includes("/a1/") || storagePath.includes("/a2/")) {
    return "Say this in a warm, clear ESL teacher voice. Use a friendly riddle-like tone, simple pacing, and bright encouragement.";
  }

  if (storagePath.includes("/b1/")) {
    return "Say this in a friendly mixed teacher and real-world narrator style. Keep the pace natural, clear, and student-friendly.";
  }

  return "Say this in a natural adult situational listening style. Use polished pronunciation, calm confidence, and clear emphasis on meaning.";
}

async function saveWaveFile(filename, pcmData, channels = 1, rate = 24000, sampleWidth = 2) {
  await mkdir(path.dirname(filename), { recursive: true });

  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on("finish", resolve);
    writer.on("error", reject);
    writer.write(pcmData);
    writer.end();
  });
}

async function generateOne(ai, item, index, overwrite) {
  const outputPath = path.join(outputRoot, item.storagePath);
  if (!overwrite && existsSync(outputPath)) {
    console.log(`[skip] ${index + 1}: ${item.storagePath}`);
    return;
  }

  console.log(`[generate] ${index + 1}: ${item.storagePath}`);

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${styleFor(item.storagePath)}\n\nRead only this script aloud:\n${item.script}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceFor(item.storagePath),
          },
        },
      },
    },
  });

  const data = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)
    ?.inlineData?.data;
  if (!data) {
    throw new Error(`No audio returned for ${item.storagePath}`);
  }

  await saveWaveFile(outputPath, Buffer.from(data, "base64"));
  console.log(`[saved] ${outputPath}`);
}

await loadDotEnv(".env.local");
await loadDotEnv(".env");

const project =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.VERTEX_AI_PROJECT ||
  defaultProject;
const location =
  process.env.GOOGLE_CLOUD_LOCATION ||
  process.env.VERTEX_AI_LOCATION ||
  process.env.GOOGLE_CLOUD_REGION ||
  defaultLocation;
const { start, limit, overwrite } = parseArgs();
const markdown = await readFile(promptFile, "utf8");
const prompts = parsePrompts(markdown).slice(start, limit ? start + limit : undefined);

if (!prompts.length) {
  throw new Error("No TTS prompts found to generate.");
}

console.log(`Model: ${model}`);
console.log("Auth: Vertex AI ADC");
console.log(`Project: ${project}`);
console.log(`Location: ${location}`);
console.log(`Output: ${outputRoot}`);
console.log(`Prompts: ${prompts.length}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Delay between batches: ${delayMs / 1000}s`);

const ai = new GoogleGenAI({
  vertexai: true,
  project,
  location,
});

for (let offset = 0; offset < prompts.length; offset += batchSize) {
  const batch = prompts.slice(offset, offset + batchSize);
  console.log(`\nBatch ${Math.floor(offset / batchSize) + 1}: prompts ${start + offset + 1}-${start + offset + batch.length}`);

  for (let index = 0; index < batch.length; index += 1) {
    await generateOne(ai, batch[index], start + offset + index, overwrite);
  }

  if (offset + batchSize < prompts.length) {
    console.log(`Waiting ${delayMs / 1000}s before next batch...`);
    await sleep(delayMs);
  }
}

console.log("TTS generation complete.");
