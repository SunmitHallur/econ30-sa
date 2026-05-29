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

const SYSTEM = `You are the Essay Guide for "The Price of Integration", an Economics 30 capstone about South Africa after 1994.

Scope:
- Answer questions about this essay, its argument, methods, data, charts, map, regressions, Two Lives narrative, and closely related background (post-1994 South Africa, RDP/GEAR, trade openness, unemployment, inequality, sectors).
- Synthesize across the provided context chunks when the question is essay-adjacent (e.g. "what is this project about?", "how did you study this?", "what should I remember?").
- Only decline when the question is clearly unrelated (other countries, unrelated homework, personal advice). Then say briefly that you focus on this project and point to #sources.

Grounding:
- Prioritize the provided context. Do not invent statistics, regression coefficients, p-values, or years not supported by the chunks.
- If chunks are partial, give a short orienting answer from what is present and name which section to read; do not pretend the essay covers something it does not.
- Prefer "association" or "lines up with" over causal claims unless the context cites district-level evidence (e.g. Erten–Leight–Tregenna).
- Use plain language for a general reader. Up to ~150 words when the question needs synthesis, unless the reader specifies a word count.
- When no word count is specified, end with one short sentence suggesting which section to read next.
- When the reader specifies a word count (e.g. "25 words", "in 30 words"), that limit is mandatory: stay at or under it, use one short paragraph only, and do not add section pointers or sign-offs.`;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Detect requests like "25 word summary" or "summarize in 40 words". */
export function parseWordLimit(question: string): number | null {
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

function truncateToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return words.join(" ");
  return words.slice(0, limit).join(" ");
}

function answerInstructions(wordLimit: number | null): string {
  if (wordLimit) {
    return `Answer in at most ${wordLimit} words (hard limit). One paragraph only. No "read the X section" footer, no bullet lists, no markdown headers. Every word must count toward the summary.`;
  }
  return `Answer in 2-4 short paragraphs. For essay-adjacent questions, connect the dots across chunks. End with one short sentence suggesting which section to read next. Do not use markdown headers.`;
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

  const wordLimit = parseWordLimit(question);

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Reader is viewing section: ${body.section || "unknown"}.

Context from the essay (may include overview/meta chunks):
${contextBlock || "(no chunks retrieved — give a brief orienting answer about what this capstone covers and point to #hero and #sources)"}

Question: ${question}

${answerInstructions(wordLimit)}`,
      maxOutputTokens: wordLimit ? Math.min(200, Math.max(48, wordLimit * 6)) : 400,
      temperature: wordLimit ? 0.15 : 0.2,
    });

    let answer = text.trim();
    if (wordLimit) {
      answer = truncateToWordLimit(answer, wordLimit);
    }

    const anchors = wordLimit
      ? ["#hero"]
      : [
          ...new Set(
            context
              .map((c) => c.anchor || (c.section ? `#${c.section}` : null))
              .filter(Boolean) as string[]
          ),
        ];

    return Response.json({
      answer,
      anchors: anchors.length ? anchors : ["#sources"],
      wordLimit: wordLimit ?? undefined,
      wordCount: countWords(answer),
    });
  } catch (err) {
    console.error("api/chat error", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
