import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

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

Rules:
- Answer ONLY using the provided context chunks. If the context does not contain the answer, say so briefly and point the reader to #sources.
- Never invent statistics, regression coefficients, p-values, or years.
- Use plain language suitable for a general reader. Keep answers under 120 words unless the question requires more detail.
- Prefer "association" or "lines up with" over causal claims unless the context cites district-level evidence (e.g. Erten–Leight–Tregenna).
- End with one short sentence suggesting which section of the essay to read next.`;

export async function HEAD() {
  const key = process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
  return new Response(null, { status: key ? 200 : 503 });
}

export async function POST(request: Request) {
  const key = process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = String(body.question || "").trim();
  if (!question) {
    return Response.json({ error: "Missing question" }, { status: 400 });
  }

  const context = Array.isArray(body.context) ? body.context : [];
  const contextBlock = context
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title} (${c.anchor || "#" + c.section})\n${c.text}`
    )
    .join("\n\n");

  const gateway = createGateway({ apiKey: key });
  const modelId =
    process.env.ESSAY_GUIDE_MODEL ?? "openai/gpt-4o-mini";

  try {
    const { text } = await generateText({
      model: gateway(modelId),
      system: SYSTEM,
      prompt: `Reader is viewing section: ${body.section || "unknown"}.

Context from the essay:
${contextBlock || "(no chunks retrieved)"}

Question: ${question}

Answer in 2-4 short paragraphs. Do not use markdown headers.`,
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
