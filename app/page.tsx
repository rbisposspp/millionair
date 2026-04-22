"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, ReactNode, useRef, useState } from "react";
import type {
  AgeBand,
  LifelineType,
  PublicQuestion,
  SessionState,
  SessionSummary,
} from "@/lib/types";

type Message = {
  id: string;
  speaker: "bobby" | "student";
  text: string;
};

const lifelines: Array<{ type: LifelineType; title: string; icon: string }> = [
  { type: "fifty_fifty", title: "Cortar 1 errada", icon: "50" },
  { type: "bobby", title: "Consultar Bobby", icon: "B" },
  { type: "skip", title: "Pular", icon: ">>" },
];

const starterSession = {
  teacherName: "Teacher",
  studentName: "Ana",
  ageBand: "teen" as AgeBand,
  topic: "general English",
};

const levelBands = [
  { label: "A1", range: "1-5" },
  { label: "A2", range: "6-10" },
  { label: "B1", range: "11-15" },
  { label: "B2", range: "16-20" },
  { label: "C1", range: "21-25" },
];
const maxVisibleMessages = 6;
const suspenseDurationMs = 1800;
const resultHoldMs = 850;

type RevealState = "idle" | "selected" | "revealing" | "correct" | "wrong";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

function renderBobbyText(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
}

export default function Home() {
  const [form, setForm] = useState(starterSession);
  const [session, setSession] = useState<SessionState | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [revealState, setRevealState] = useState<RevealState>("idle");
  const audioContextRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    audioContextRef.current ??= createAudioContext();
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      return null;
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    return audioContext;
  }

  function playTone(
    audioContext: AudioContext,
    {
      startTime,
      duration,
      frequency,
      type = "sawtooth",
      gain = 0.08,
      endGain = 0.0001,
    }: {
      startTime: number;
      duration: number;
      frequency: number;
      type?: OscillatorType;
      gain?: number;
      endGain?: number;
    },
  ) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(endGain, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  function playLockAnswerSuspense() {
    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const startTime = audioContext.currentTime + 0.02;
    const pulseTimes = [0, 0.6, 1.2];

    pulseTimes.forEach((offset, index) => {
      const pulseStart = startTime + offset;
      playTone(audioContext, {
        startTime: pulseStart,
        duration: 0.42,
        frequency: 220 - index * 18,
        type: "sawtooth",
        gain: 0.05,
      });
      playTone(audioContext, {
        startTime: pulseStart + 0.08,
        duration: 0.34,
        frequency: 110 - index * 8,
        type: "triangle",
        gain: 0.04,
      });
    });
  }

  function playCorrectSting() {
    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const startTime = audioContext.currentTime + 0.02;
    [392, 523.25, 659.25].forEach((frequency, index) => {
      playTone(audioContext, {
        startTime: startTime + index * 0.11,
        duration: 0.34,
        frequency,
        type: "triangle",
        gain: 0.08,
      });
    });
  }

  function playWrongSting() {
    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const startTime = audioContext.currentTime + 0.02;
    [196, 164.81, 138.59].forEach((frequency, index) => {
      playTone(audioContext, {
        startTime: startTime + index * 0.08,
        duration: 0.42,
        frequency,
        type: "square",
        gain: 0.07,
      });
    });
  }

  const currentNumber = session ? Math.min(session.currentQuestionIndex + 1, session.totalQuestions) : 1;
  const isRoundDone = session?.status === "completed" || session?.status === "lost" || session?.status === "summarized";
  const eliminatedOptionIds = question?.eliminatedOptionIds ?? [];

  function addMessage(speaker: Message["speaker"], text: string) {
    setMessages((items) =>
      [...items, { id: crypto.randomUUID(), speaker, text }].slice(-maxVisibleMessages),
    );
  }

  function announceQuestion(nextQuestion: PublicQuestion, nextSession: SessionState) {
    addMessage(
      "bobby",
      `Question ${nextSession.currentQuestionIndex + 1} of ${nextSession.totalQuestions} (${nextQuestion.level}). ${nextQuestion.prompt}`,
    );
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("Montando a escada");
    setError("");
    setSummary(null);
    setImageDataUrl("");
    setSelectedOptionId("");
    setRevealState("idle");
    setMessages([]);

    try {
      const payload = await postJson<{ session: SessionState; question: PublicQuestion }>(
        "/api/sessions",
        form,
      );
      setSession(payload.session);
      setQuestion(payload.question);
      setMessages([
        {
          id: crypto.randomUUID(),
          speaker: "bobby",
          text: `Welcome, ${payload.session.studentName}. We start at A1 and climb all the way to C1 for the ${payload.session.prizeLabel}.`,
        },
        {
          id: crypto.randomUUID(),
          speaker: "bobby",
          text: `Question 1 of ${payload.session.totalQuestions} (${payload.question.level}). ${payload.question.prompt}`,
        },
      ]);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function submitAnswer() {
    if (!session || !question || !selectedOptionId) {
      return;
    }

    const choice = question.options.find((option) => option.id === selectedOptionId);
    if (!choice) {
      return;
    }

    setBusy("Conferindo resposta");
    setError("");
    addMessage("student", `${choice.label}. ${choice.text}`);
    setRevealState("revealing");
    playLockAnswerSuspense();

    try {
      const payloadPromise = postJson<{
        bobby: { reply: string };
        wasCorrect: boolean;
        session: SessionState;
        question: PublicQuestion | null;
      }>("/api/answer", {
        sessionId: session.id,
        questionId: question.id,
        optionId: selectedOptionId,
      });
      const [payload] = await Promise.all([payloadPromise, wait(suspenseDurationMs)]);
      setRevealState(payload.wasCorrect ? "correct" : "wrong");
      if (payload.wasCorrect) {
        playCorrectSting();
      } else {
        playWrongSting();
      }
      await wait(resultHoldMs);

      setSelectedOptionId("");
      setRevealState("idle");
      setSession(payload.session);
      setQuestion(payload.question);
      if (payload.question) {
        setMessages([]);
      }
      addMessage("bobby", payload.bobby.reply);

      if (payload.question) {
        announceQuestion(payload.question, payload.session);
      } else if (payload.session.status === "completed") {
        addMessage("bobby", `You cleared all 25 questions and won the ${payload.session.prizeLabel}.`);
      } else {
        addMessage("bobby", "Game over. One wrong answer ends the climb.");
      }
    } catch (requestError) {
      setError((requestError as Error).message);
      setRevealState("selected");
    } finally {
      setBusy("");
    }
  }

  async function activateLifeline(type: LifelineType) {
    if (!session || !question) {
      return;
    }

    setBusy("Usando recurso");
    setError("");

    try {
      const payload = await postJson<{
        lifeline: {
          hint: string;
          removedOptionId?: string;
          suggestedOptionLabel?: string;
        };
        session: SessionState;
        question?: PublicQuestion | null;
      }>("/api/lifeline", { sessionId: session.id, questionId: question.id, type });

      setSession(payload.session);
      if (payload.question !== undefined) {
        setQuestion(payload.question);
        setSelectedOptionId("");
        setRevealState("idle");
        if (type === "skip" && payload.question) {
          setMessages([]);
        }
      }
      addMessage("bobby", payload.lifeline.hint);

      if (type === "skip" && payload.question) {
        announceQuestion(payload.question, payload.session);
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function createImage() {
    if (!session || !imagePrompt.trim()) {
      return;
    }

    setBusy("Criando imagem bônus");
    setError("");

    try {
      const payload = await postJson<{
        image: { imageData: string; mimeType: string };
        session: SessionState;
      }>("/api/image", {
        sessionId: session.id,
        description: imagePrompt,
      });

      setSession(payload.session);
      setImageDataUrl(`data:${payload.image.mimeType};base64,${payload.image.imageData}`);
      addMessage("bobby", "Here is a bonus visual to practice before the next choice.");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function finishSession() {
    if (!session) {
      return;
    }

    setBusy("Escrevendo resumo");
    setError("");

    try {
      const payload = await postJson<{ summary: SessionSummary; session: SessionState }>(
        `/api/sessions/${session.id}/summary`,
        {},
      );

      setSummary(payload.summary);
      setSession(payload.session);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">BIG Corn ESL ladder</p>
          <h1>Bobby Millionaire ESL</h1>
          <p className="hero-copy">
            Twenty-five multiple-choice questions from A1 to C1. One wrong answer ends the run.
            Use Bobby, skip, or cut one wrong option once each.
          </p>
        </div>
        <div className="scoreboard" aria-live="polite">
          <span>{session ? `Question ${currentNumber}` : "Ready"}</span>
          <strong>{busy || (session ? session.prizeLabel : "25-question ladder")}</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel" aria-label="Game controls">
          <form onSubmit={createSession} className="setup-form">
            <label>
              Teacher
              <input
                value={form.teacherName}
                onChange={(event) => setForm({ ...form, teacherName: event.target.value })}
              />
            </label>
            <label>
              Student
              <input
                value={form.studentName}
                onChange={(event) => setForm({ ...form, studentName: event.target.value })}
              />
            </label>
            <label>
              Topic
              <input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} />
            </label>
            <label>
              Age
              <select
                value={form.ageBand}
                onChange={(event) => setForm({ ...form, ageBand: event.target.value as AgeBand })}
              >
                <option>young learner</option>
                <option>teen</option>
                <option>adult</option>
              </select>
            </label>
            <button className="primary" disabled={Boolean(busy)}>
              Start Ladder
            </button>
          </form>

          <div className="ladder-card">
            <span>Ladder</span>
            <ol>
              {levelBands.map((band) => (
                <li key={band.label}>
                  <strong>{band.label}</strong>
                  <small>{band.range}</small>
                </li>
              ))}
            </ol>
          </div>

          <div className="lifelines">
            {lifelines.map((item) => {
              const used = Boolean(session?.usedLifelines.includes(item.type));
              return (
                <button
                  key={item.type}
                  className="lifeline"
                  disabled={!session || !question || used || Boolean(busy) || isRoundDone}
                  onClick={() => activateLifeline(item.type)}
                  title={used ? "Already used in this game" : item.title}
                >
                  <span>{item.icon}</span>
                  {item.title}
                </button>
              );
            })}
          </div>

          <div className="image-tool">
            <label>
              Bonus image
              <textarea
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="A modern office interview room..."
              />
            </label>
            <button disabled={!session || !imagePrompt.trim() || Boolean(busy)} onClick={createImage}>
              Generate Image
            </button>
          </div>
        </aside>

        <section className="stage" aria-label="Live classroom stage">
          <div className="question-box">
            <span>
              {question
                ? `${question.level} / ${question.type} / ${question.modality}`
                : "Current question"}
            </span>
            <h2>{question?.prompt ?? "Start a ladder to reveal the first question."}</h2>
          </div>

          {question?.asset ? (
            <figure className={`media-card ${question.asset.kind}`}>
              {question.asset.kind === "image" && question.assetUrl ? (
                <img src={question.assetUrl} alt={question.asset.altText ?? "ESL visual prompt"} />
              ) : null}
              {question.asset.kind === "audio" && question.assetUrl ? (
                <audio controls src={question.assetUrl}>
                  <track kind="captions" />
                </audio>
              ) : null}
              {!question.assetUrl ? (
                <div className="media-placeholder">
                  <strong>{question.asset.kind === "image" ? "Image prompt" : "Audio prompt"}</strong>
                  <span>{question.asset.storagePath}</span>
                </div>
              ) : null}
              <figcaption>{question.asset.altText}</figcaption>
            </figure>
          ) : null}

          {error ? <div className="error">{error}</div> : null}

          {question ? (
            <div className="options-grid">
              {question.options.map((option) => {
                const hidden = eliminatedOptionIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    className={`option-card ${
                      selectedOptionId === option.id ? `is-${revealState}` : ""
                    }`}
                    disabled={Boolean(busy) || isRoundDone || hidden}
                    onClick={() => {
                      setSelectedOptionId(option.id);
                      setRevealState("selected");
                    }}
                  >
                    <strong>{option.label}</strong>
                    <span>{hidden ? "Removed" : option.text}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="chat-log">
            {messages.map((message) => (
              <article key={message.id} className={`message ${message.speaker}`}>
                <span>{message.speaker}</span>
                <p>{renderBobbyText(message.text)}</p>
              </article>
            ))}
          </div>

          {imageDataUrl ? (
            <figure className="generated-image">
              <img src={imageDataUrl} alt="Generated ESL classroom activity" />
              <figcaption>Bonus image for vocabulary, prediction, or speaking warm-up.</figcaption>
            </figure>
          ) : null}

          <div className="composer">
            <button
              onClick={submitAnswer}
              disabled={!session || !question || !selectedOptionId || Boolean(busy) || isRoundDone}
            >
              Lock Answer
            </button>
          </div>

          <div className="finish-row">
            <button disabled={!session || Boolean(busy) || session.status === "active"} onClick={finishSession}>
              Finish & Summarize
            </button>
          </div>
        </section>

        <aside className="summary-panel" aria-label="Teacher summary">
          <h2>Teacher Summary</h2>
          {summary ? (
            <>
              <p>{summary.overview}</p>
              <h3>Activities</h3>
              <ul>
                {summary.activitiesUsed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Language focus</h3>
              <ul>
                {summary.languageFocus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Next step</h3>
              <p>{summary.suggestedNextStep}</p>
            </>
          ) : (
            <p>
              Play until the student wins the full ladder or loses on a wrong answer. Then generate
              the compact report for the teacher.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
