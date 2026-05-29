import { createGateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import {
  checkOrigin,
  checkRateLimit,
  clampContext,
  guardStatus,
  isGuideEnabled,
  validateQuestion,
} from "./essay-guide-guard.js";

export const config = {
  runtime: "nodejs",
};

type CorpusChunk = {
  id: string;
  section: string;
  title: string;
  text: string;
  anchor?: string;
};

type ChatBody = {
  question?: string;
  section?: string;
  context?: CorpusChunk[];
};

type AnswerFormat =
  | { kind: "wordLimit"; limit: number }
  | { kind: "oneSentence" }
  | { kind: "brief" }
  | { kind: "detailed" }
  | { kind: "default" };

const SYSTEM = `You are the Essay Guide for "The Price of Integration", an Economics 30 capstone about South Africa after 1994.

Scope:
- Answer questions about this essay, its argument, methods, data, charts, map, regressions, Two Lives narrative, and closely related background (post-1994 South Africa, RDP/GEAR, trade openness, unemployment, inequality, sectors).
- Synthesize across the provided context chunks when the question is essay-adjacent.
- Only decline when the question is clearly unrelated (other countries, unrelated homework, personal advice). Then say briefly that you focus on this project and point to #sources.

Grounding:
- Prioritize the provided context. Do not invent statistics, regression coefficients, p-values, or years not supported by the chunks.
- If chunks are partial, give a short orienting answer from what is present; do not pretend the essay covers something it does not.
- Prefer "association" or "lines up with" over causal claims unless the context cites district-level evidence (e.g. Erten–Leight–Tregenna).

Length and format (follow the instruction block for each request):
- Match what the reader asks for: explicit word counts, "briefly", "one sentence", "in depth", lists, comparisons, summaries, etc.
- Never ignore a stated word limit or brevity request. Never pad a short answer with extra paragraphs or "read section X" sign-offs when they asked for tight length.`;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function parseWordLimit(question: string): number | null {
  const q = question.trim();
  const patterns = [
    /\b(\d{1,3})\s*[-]?\s*words?\b/i,
    /\bwithin\s+(\d{1,3})\s+words?\b/i,
    /\bmax(?:imum)?\s+(\d{1,3})\s+words?\b/i,
    /\bin\s+(\d{1,3})\s+words?\b/i,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 5 && n <= 120) return n;
    }
  }
  return null;
}

function parseAnswerFormat(question: string): AnswerFormat {
  const limit = parseWordLimit(question);
  if (limit) return { kind: "wordLimit", limit };

  const q = question.toLowerCase();
  if (/\b(one sentence|single sentence|in a sentence|one-line)\b/.test(q)) {
    return { kind: "oneSentence" };
  }
  if (
    /\b(very brief|briefly|short answer|keep it short|quick(ly)?|tl;dr|tl dr|concise)\b/.test(
      q
    )
  ) {
    return { kind: "brief" };
  }
  if (
    /\b(in depth|detailed|comprehensive|explain fully|walk me through|long answer|elaborate)\b/.test(
      q
    )
  ) {
    return { kind: "detailed" };
  }
  return { kind: "default" };
}

function truncateToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return words.join(" ");
  return words.slice(0, limit).join(" ");
}

function answerInstructions(format: AnswerFormat): string {
  switch (format.kind) {
    case "wordLimit":
      return `The reader asked for at most ${format.limit} words. Stay at or under that count. One paragraph only—no section pointers, no bullet lists, no markdown headers.`;
    case "oneSentence":
      return `Answer in exactly one sentence (about 15–35 words). No section footer, no lists.`;
    case "brief":
      return `Answer in 2–4 sentences (under ~80 words). Stay direct; skip a section footer unless essential.`;
    case "detailed":
      return `Give a fuller grounded answer in up to 4–6 short paragraphs (about 200–280 words). Connect evidence across chunks. End with one sentence on where to read next. No markdown headers.`;
    default:
      return `Answer in 2–4 short paragraphs (~80–150 words). Connect ideas across chunks when helpful. End with one short sentence suggesting which section to read next. No markdown headers.`;
  }
}

function maxTokensForFormat(format: AnswerFormat): number {
  switch (format.kind) {
    case "wordLimit":
      return Math.min(220, Math.max(48, format.limit * 6));
    case "oneSentence":
      return 72;
    case "brief":
      return 140;
    case "detailed":
      return 560;
    default:
      return 400;
  }
}

function isCompactFormat(format: AnswerFormat): boolean {
  return (
    format.kind === "wordLimit" ||
    format.kind === "oneSentence" ||
    format.kind === "brief"
  );
}

function serviceUnavailable(message: string) {
  return Response.json({ error: message }, { status: 503 });
}

/** OpenAI keys must use @ai-sdk/openai; gateway keys use AI Gateway model ids. */
function resolveModel(): LanguageModel | null {
  const modelEnv = process.env.ESSAY_GUIDE_MODEL ?? "gpt-4o-mini";
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (gatewayKey) {
    const gateway = createGateway({ apiKey: gatewayKey });
    const modelId = modelEnv.includes("/") ? modelEnv : `openai/${modelEnv}`;
    return gateway(modelId);
  }

  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelId = modelEnv.replace(/^openai\//, "");
    return openai(modelId);
  }

  return null;
}

export async function HEAD() {
  const status = guardStatus();
  if (!status.enabled) return new Response(null, { status: 503 });
  if (!status.hasKey) return new Response(null, { status: 503 });
  return new Response(null, {
    status: 200,
    headers: {
      "X-Essay-Guide-RateLimit": status.rateLimit ? "upstash" : "off",
    },
  });
}

export async function POST(request: Request) {
  if (!isGuideEnabled()) {
    return serviceUnavailable("Essay guide is temporarily disabled.");
  }

  const model = resolveModel();
  if (!model) {
    return serviceUnavailable("AI not configured");
  }

  const originBlock = checkOrigin(request);
  if (originBlock) return originBlock;

  const rateBlock = await checkRateLimit(request);
  if (rateBlock) return rateBlock;

  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = String(body.question || "").trim();
  const questionError = validateQuestion(question);
  if (questionError) return questionError;

  const context = clampContext(
    Array.isArray(body.context) ? body.context : []
  );
  const contextBlock = context
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title} (${c.anchor || "#" + c.section})\n${c.text}`
    )
    .join("\n\n");

  const format = parseAnswerFormat(question);
  const compact = isCompactFormat(format);

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Reader is viewing section: ${body.section || "unknown"}.

Context from the essay (may include overview/meta chunks):
${contextBlock || "(no chunks retrieved — give a brief orienting answer about what this capstone covers and point to #hero and #sources)"}

Question: ${question}

${answerInstructions(format)}`,
      maxOutputTokens: maxTokensForFormat(format),
      temperature: compact ? 0.15 : 0.2,
    });

    let answer = text.trim();
    if (format.kind === "wordLimit") {
      answer = truncateToWordLimit(answer, format.limit);
    } else if (format.kind === "oneSentence") {
      const first = answer.split(/(?<=[.!?])\s+/)[0]?.trim();
      if (first) answer = first;
      answer = truncateToWordLimit(answer, 40);
    } else if (format.kind === "brief") {
      answer = truncateToWordLimit(answer, 90);
    }

    const anchors = [
      ...new Set(
        context
          .map((c) => c.anchor || (c.section ? `#${c.section}` : null))
          .filter(Boolean) as string[]
      ),
    ];

    return Response.json({
      answer,
      anchors: anchors.length ? anchors.slice(0, 3) : ["#sources"],
      compact,
      wordLimit: format.kind === "wordLimit" ? format.limit : undefined,
      wordCount: countWords(answer),
    });
  } catch (err) {
    console.error("api/chat error", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
