import { GoogleGenAI } from "@google/genai";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const promptFile = "docs/image-generation-prompts.md";
const outputRoot = "public/media";
const model = "imagen-4.0-ultra-generate-001";
const batchSize = 5;
const delayMs = 30_000;
const defaultProject = "noble-velocity-492304-b6";
const defaultLocation = "us-central1";

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFile(filePath, "utf8");
  return text.then((content) => {
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
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrompts(markdown) {
  const sections = markdown.split(/^### `/m).slice(1);
  return sections.map((section) => {
    const [titleLine, ...bodyLines] = section.split("\n");
    const storagePath = titleLine.replace(/`/g, "").trim();
    const prompt = bodyLines.join("\n").trim();
    return { storagePath, prompt };
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

async function generateOne(ai, item, index, overwrite) {
  const outputPath = path.join(outputRoot, item.storagePath);
  if (!overwrite && existsSync(outputPath)) {
    console.log(`[skip] ${index + 1}: ${item.storagePath}`);
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  console.log(`[generate] ${index + 1}: ${item.storagePath}`);

  const response = await ai.models.generateImages({
    model,
    prompt: item.prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
      imageSize: "2K",
      personGeneration: "allow_all",
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error(`No image returned for ${item.storagePath}`);
  }

  await writeFile(outputPath, Buffer.from(imageBytes, "base64"));
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
  throw new Error("No prompts found to generate.");
}

console.log(`Model: ${model}`);
console.log(`Auth: Vertex AI ADC`);
console.log(`Project: ${project}`);
console.log(`Location: ${location}`);
console.log(`Output: ${outputRoot}`);
console.log(`Prompts: ${prompts.length}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Delay between batches: ${delayMs / 1000}s`);
console.log("Estimated Imagen 4 Ultra API cost: $0.06 per generated image, before taxes/fees.");

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

console.log("Image generation complete.");
