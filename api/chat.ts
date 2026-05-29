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
- Use plain language for a general reader. Up to ~150 words when the question needs synthesis.
- End with one short sentence suggesting which section to read next.`;

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

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Reader is viewing section: ${body.section || "unknown"}.

Context from the essay (may include overview/meta chunks):
${contextBlock || "(no chunks retrieved — give a brief orienting answer about what this capstone covers and point to #hero and #sources)"}

Question: ${question}

Answer in 2-4 short paragraphs. For essay-adjacent questions, connect the dots across chunks. Do not use markdown headers.`,
      maxOutputTokens: 400,
      temperature: 0.2,
    });

    const anchors = [
      ...new Set(
        context
          .map((c) => c.anchor || (c.section ? `#${c.section}` : null))
          .filter(Boolean) as string[]
      ),
    ];

    return Response.json({
      answer: text.trim(),
      anchors: anchors.length ? anchors : ["#sources"],
    });
  } catch (err) {
    console.error("api/chat error", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
