import type { AgeBand, LifelineType, SessionInput } from "./types";

const ageBands = new Set<AgeBand>(["young learner", "teen", "adult"]);
const lifelines = new Set<LifelineType>(["fifty_fifty", "bobby", "skip"]);

export function cleanText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`${field} is required.`);
  }

  if (cleaned.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  }

  return cleaned;
}

export function parseSessionInput(body: Record<string, unknown>): SessionInput {
  const ageBand = cleanText(body.ageBand, "ageBand", 40) as AgeBand;

  if (!ageBands.has(ageBand)) {
    throw new Error("ageBand must be young learner, teen, or adult.");
  }

  return {
    teacherName: cleanText(body.teacherName, "teacherName", 80),
    studentName: cleanText(body.studentName, "studentName", 80),
    ageBand,
    topic: cleanText(body.topic, "topic", 140),
  };
}

export function parseLifeline(value: unknown): LifelineType {
  const type = cleanText(value, "type", 40) as LifelineType;
  if (!lifelines.has(type)) {
    throw new Error("type must be fifty_fifty, bobby, or skip.");
  }

  return type;
}
