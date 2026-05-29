#!/usr/bin/env node
/**
 * Regression tests for Essay Guide query routing (off-topic vs answer).
 * Simulates client-side resolveHits + buildLocalAnswer (no API).
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = JSON.parse(
  readFileSync(join(ROOT, "website_v2/data/essay_corpus.json"), "utf8")
);

const STOPWORDS = new Set(
  "a an the and or but in on at to for of is are was were be been being it its that with from as by not no so if than then into who which their there they them we you your our".split(" ")
);
const SCORE_THRESHOLD = 0.55;
const RETRIEVE_TOP_K = 5;
const META_CHUNK_IDS = [
  "meta-scope",
  "meta-methods",
  "meta-sections",
  "meta-sa-context",
  "meta-findings",
];
const ESSAY_ADJACENT_RE =
  /\b(essay|site|project|capstone|econ(?:omics)?\s*30|thesis|argument|claim|finding|conclusion|method|methodolog|data|dataset|source|chart|map|regression|evidence|caus|associat|apartheid|south africa|post.?1994|integration|inclusion|openness|trade|gear|rdp|unemployment|inequality|manufactur|sector|pieter|sipho|two lives|wdi|qlfs|benjamini|bonferroni|chow|present|professor|reader|section|walkthrough|gdp|provinc|geograph|policy|democrat|sanction|township|hallur|takeaway|summar|explain|compare)\b/i;
const GENERIC_QUERY_TOKENS = new Set(
  "about tell show mean help like good best much many some also just really very here there when where does did was were been being have has had can could would should make made year years time people work world country south africa who what why how compare explain summarize better won".split(
    " "
  )
);

const substantiveTokens = (query) =>
  tokenize(query).filter(
    (t) => !GENERIC_QUERY_TOKENS.has(t) && !/^\d+$/.test(t)
  );
const sectionOrder = [
  "hero", "question", "from-the-ground", "timeline", "macro", "sectors",
  "inequality", "two-lives", "results", "map", "conclusions", "ask-anything", "sources",
];

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

const normalizeQuery = (q) =>
  String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isStrongEssayAdjacent = (query) => {
  const n = normalizeQuery(query);
  if (!n || n.length < 3) return false;
  if (ESSAY_ADJACENT_RE.test(n)) return true;
  if (/\b(who|what|why|how)\b/.test(n) && queryTouchesCorpus(query)) return true;
  return false;
};

const isVagueOpenQuestion = (query) =>
  /\b(tell me more|more about (?:this|it|that)|explain this|what about this|go on|continue|say more|elaborate)\b/i.test(
    String(query || "")
  );

const isLaypersonHelpQuery = (query) =>
  /\b(i am confused|i'?m confused|im confused|help i'?m confused|help im confused|i am lost|i'?m lost|im lost|don'?t understand any|do not understand any|no idea what this|make sense of this|what am i looking at|where do i even start|help me understand)\b/i.test(
    String(query || "")
  );

const OFF_TOPIC_TOPIC_RE =
  /\b(ishowspeed|taylor swift|minecraft|marvel|mcu|netflix|iphone|climate change|global warming|write my homework|homework for me|homework essay|translate(?: this)?(?: page)? to spanish|us election|presidential election|super bowl|best pizza|recipe for|fortnite|tiktok|nba\b|nfl\b|messi|ronaldo|disney\+|spotify)\b/i;

let corpusVocab = null;
const getCorpusVocab = () => {
  if (corpusVocab) return corpusVocab;
  const vocab = new Set(sectionOrder);
  for (const chunk of corpus.chunks) {
    tokenize(chunk.title).forEach((t) => vocab.add(t));
    tokenize(chunk.text).forEach((t) => {
      if (t.length >= 4) vocab.add(t);
    });
    (chunk.keywords || []).forEach((k) => vocab.add(String(k).toLowerCase()));
  }
  corpusVocab = vocab;
  return vocab;
};

const queryTouchesCorpus = (query) =>
  substantiveTokens(query).some((t) => getCorpusVocab().has(t));

const isObviousOffTopic = (query, rawHits) => {
  const n = normalizeQuery(query);
  if (OFF_TOPIC_TOPIC_RE.test(n)) return true;
  if (isStrongEssayAdjacent(query)) return false;
  if (isVagueOpenQuestion(query)) return false;
  if (isLaypersonHelpQuery(query)) return false;
  if (queryTouchesCorpus(query)) return false;
  if (rawHits[0]?.score >= 20) return false;
  const subs = substantiveTokens(query);
  if (!subs.length) return true;
  const top = rawHits[0]?.score ?? 0;
  return top < 20;
};

const isEssayAdjacentQuery = (query) =>
  isStrongEssayAdjacent(query) ||
  isVagueOpenQuestion(query) ||
  isLaypersonHelpQuery(query) ||
  queryTouchesCorpus(query);

const getChunkById = (id) => corpus.chunks.find((c) => c.id === id);

const getMetaHits = () =>
  META_CHUNK_IDS.map((id) => getChunkById(id))
    .filter(Boolean)
    .map((chunk) => ({ chunk, score: 1.2 }));

const getSectionOverviewHit = (sectionId) => {
  const chunk = corpus.chunks.find(
    (c) =>
      c.section === sectionId &&
      !c.id.startsWith("kb-") &&
      !c.id.startsWith("meta-")
  );
  return chunk ? { chunk, score: 0.85 } : null;
};

const chunkNoisePenalty = (chunk) => {
  const t = chunk.text || "";
  let penalty = 0;
  if (chunk.id?.startsWith("meta-") || chunk.id?.startsWith("faq-")) return 0;
  if ((t.match(/→/g) || []).length >= 2) penalty += 4;
  if (/% of (GDP|employed)/i.test(t)) penalty += 3;
  if (chunk.id?.startsWith("kb-") && !chunk.id.includes("gear") && !chunk.id.includes("rdp")) penalty += 1.5;
  if (/^##\s/m.test(t)) penalty += 4;
  return penalty;
};

const findCuratedChunk = (query) => {
  const q = normalizeQuery(query);
  const rules = [
    { test: () => /\bwhat is this (essay|site|project)\b/.test(q) || q === "what is this essay about", id: "faq-what-is-this-essay-about" },
    { test: () => /\bwhat happened in 1994\b/.test(q) || (q.includes("1994") && q.includes("happened")), id: "faq-what-happened-in-1994" },
    { test: () => /\bwhat happened in 1996\b/.test(q) || (q.includes("1996") && q.includes("happened")), id: "faq-what-happened-in-1996" },
    { test: () => /\bwhat is gear\b/.test(q) || (q.includes("gear") && q.includes("what")), id: "faq-what-is-gear" },
    { test: () => /\bwhat is rdp\b/.test(q), id: "faq-what-is-rdp" },
    { test: () => /\bwhen did trade\b/.test(q) || (q.includes("trade") && (q.includes("rise") || q.includes("increase") || q.includes("grow"))), id: "faq-when-did-trade-rise" },
    { test: () => /\bwhy\b.*\bunemployment\b/.test(q) || /\bunemployment\b.*\b(stay|high|fall)\b/.test(q), id: "faq-why-unemployment" },
    { test: () => q.includes("map") && (q.includes("show") || q.includes("what")), id: "faq-what-does-the-map-show" },
    { test: () => q.includes("one sentence") || q.includes("remember"), id: "faq-remember-one-sentence" },
    { test: () => /\b(thesis|main argument|central claim|what is this (about|project))\b/.test(q), id: "faq-what-is-this-essay-about" },
    { test: () => /\b(method|methodolog|how did you (study|analyze)|what data)\b/.test(q), id: "faq-what-data-do-you-use" },
    { test: () => /\b(causation|causal|correlation|prove caus)\b/.test(q), id: "faq-causation-or-correlation" },
    { test: () => /\b(pieter|sipho|two lives|characters)\b/.test(q), id: "faq-who-are-pieter-and-sipho" },
    { test: () => /\b(main finding|takeaway|headline|summar)/.test(q), id: "faq-what-are-the-main-findings" },
    { test: () => /\b(section|structure|navigate|organized)\b/.test(q), id: "meta-sections" },
    { test: () => /\b(capstone|econ\s*30|who wrote|author)\b/.test(q), id: "meta-scope" },
  ];
  for (const rule of rules) {
    if (!rule.test()) continue;
    const chunk = corpus.chunks.find((c) => c.id === rule.id);
    if (chunk) return { chunk, score: 20 };
  }
  return null;
};

const retrieve = (query, sectionBoostId) => {
  const qNorm = normalizeQuery(query);
  const qTokens = tokenize(query);
  if (!qNorm) return [];

  const scored = corpus.chunks.map((chunk) => {
    const hay = [
      chunk.text,
      chunk.title,
      ...(chunk.keywords || []),
      ...(chunk.kb || []),
    ].join(" ").toLowerCase();
    let score = 0;

    if (chunk.id.startsWith("faq-")) {
      const faqKey = chunk.id.replace("faq-", "").replace(/-/g, " ");
      if (qNorm.includes(faqKey)) score += 12;
      const faqWords = faqKey.split(" ").filter((w) => w.length > 2);
      const matched = faqWords.filter((w) => qNorm.includes(w)).length;
      score += matched * 2.5;
    }

    for (const t of qTokens) {
      if (hay.includes(t)) score += 1;
      if ((chunk.keywords || []).includes(t)) score += 0.5;
    }

    if (/\b(essay|project|site|about)\b/.test(qNorm) && chunk.section === "hero") score += 2;
    if (/\b1994\b/.test(qNorm) && ["timeline", "question", "hero"].includes(chunk.section)) score += 2;
    if (/\b1996\b/.test(qNorm) && ["timeline", "question"].includes(chunk.section)) score += 3;
    if (/\b(trade|openness|exports|imports)\b/.test(qNorm) && chunk.section === "macro") score += 3;
    if (/\b(happened|when|timeline|year)\b/.test(qNorm) && chunk.section === "timeline") score += 2;
    if (sectionBoostId && chunk.section === sectionBoostId) score += 1;

    if (/\b(method|data|regression|evidence|study|analyze)\b/.test(qNorm)) {
      if (["results", "sources"].includes(chunk.section) || chunk.id?.startsWith("stats-")) score += 2;
      if (chunk.id?.startsWith("meta-methods")) score += 4;
    }
    if (/\b(about|essay|project|capstone|thesis|argument)\b/.test(qNorm)) {
      if (chunk.section === "hero" || chunk.id?.startsWith("meta-scope")) score += 3;
    }
    if (/\b(finding|takeaway|conclusion|remember|summary)\b/.test(qNorm)) {
      if (["conclusions", "results"].includes(chunk.section)) score += 2;
      if (chunk.id === "meta-findings") score += 3;
    }
    if (/\b(section|navigate|where|find|structure)\b/.test(qNorm) && chunk.id === "meta-sections") score += 4;
    if (/\b(pieter|sipho|story|interactive|lives)\b/.test(qNorm) && chunk.section === "two-lives") score += 3;

    score -= chunkNoisePenalty(chunk);
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVE_TOP_K);
};

const enrichHits = (query, hits, sectionId) => {
  const seen = new Set(hits.map((h) => h.chunk.id));
  const out = [...hits];
  const add = (item) => {
    if (item && !seen.has(item.chunk.id)) {
      seen.add(item.chunk.id);
      out.push(item);
    }
  };
  const weak = !hits.length || hits[0].score < SCORE_THRESHOLD;
  if (!isEssayAdjacentQuery(query) && !weak) {
    return out.sort((a, b) => b.score - a.score).slice(0, RETRIEVE_TOP_K);
  }
  getMetaHits().forEach(add);
  add(getSectionOverviewHit(sectionId));
  const hero = getChunkById("hero") || corpus.chunks.find((c) => c.section === "hero");
  if (hero) add({ chunk: hero, score: 0.7 });
  return out.sort((a, b) => b.score - a.score).slice(0, RETRIEVE_TOP_K);
};

const resolveHits = (query, sectionId = "macro") => {
  const curated = findCuratedChunk(query);
  let hits = curated ? [curated] : retrieve(query, sectionId);
  if (!curated && hits.length && hits[0].score < SCORE_THRESHOLD) {
    const retry = retrieve(query, null);
    if (retry[0]?.score > hits[0].score) hits = retry;
  }
  const offTopic = !curated && isObviousOffTopic(query, hits);
  if (offTopic) return { hits, offTopic: true, curated: !!curated };
  return { hits: enrichHits(query, hits, sectionId), offTopic: false, curated: !!curated };
};

const classify = (query, sectionId = "macro") => {
  const { hits, offTopic, curated } = resolveHits(query, sectionId);
  if (offTopic) {
    return {
      route: "obvious-decline",
      topScore: hits[0]?.score ?? 0,
      curated,
      strong: isStrongEssayAdjacent(query),
      corpus: queryTouchesCorpus(query),
      vague: isVagueOpenQuestion(query),
    };
  }
  const wouldCallApi = hits.length > 0 || isEssayAdjacentQuery(query);
  return {
    route: wouldCallApi ? "answer-path" : "local-only",
    topScore: hits[0]?.score ?? 0,
    enrichedTop: hits[0]?.chunk?.id,
    curated,
    strong: isStrongEssayAdjacent(query),
    corpus: queryTouchesCorpus(query),
    vague: isVagueOpenQuestion(query),
  };
};

const SHOULD_DECLINE = [
  "can you tell me about iShowSpeed?",
  "who is taylor swift",
  "tell me about minecraft",
  "best pizza in brooklyn",
  "asdf qwerty plugh",
  "who won the super bowl 2024",
  "is lebron better than jordan",
  "write me a love poem",
  "how do I fix my iphone",
];

const SHOULD_ANSWER = [
  "What is this project about?",
  "Why didn't unemployment fall?",
  "What is GEAR?",
  "What is GEAR and why does it matter here?",
  "What data do you use?",
  "Summarize the essay in three sentences.",
  "How should I explain this to my professor?",
  "What survived the regression tests?",
  "What is trade openness?",
  "What happened in 1994?",
  "What happened in 1996?",
  "What are the main findings?",
  "Who are Pieter and Sipho?",
  "What does the map show?",
  "Is this causation or correlation?",
  "What is RDP?",
  "What is BH significant?",
  "What's the one sentence to remember?",
  "Why start with photos?",
  "What is a township?",
  "Does trade explain inequality?",
  "What are tradable sectors?",
  "What is Erten-Leight-Tregenna?",
  "How unequal is South Africa?",
  "What is the policy lesson?",
  "Explain the sector story",
  "What about manufacturing jobs",
  "Did integration help everyone",
  "Sanctions lifting effects",
  "QLFS vs WDI data",
  "What charts show unemployment?",
  "Help me present this capstone",
  "What is Two Lives?",
  "Provincial unemployment differences",
  "What is the research question?",
  "GEAR vs RDP",
  "Why didn't jobs follow growth?",
  "What is apartheid legacy here",
  "Benjamini Hochberg results",
  "What is the thesis in one sentence",
  "Who wrote this essay",
  "What sections should I read",
  "Durban port role in essay",
  "Inequality and trade openness",
  "What is WDI",
  "Post 1994 democratisation",
  "Main takeaway for conclusions",
  "Can you compare Pieter and Sipho",
  "What does BH significant mean",
  "Unemployment map colors",
  "Briefly what is this essay about",
  "25 word summary of findings",
];

const VAGUE_SHOULD_ANSWER = [
  "tell me more",
  "explain this",
  "go on",
  "what about this",
  "say more",
  "continue",
  "elaborate",
];

const BORDERLINE_SHOULD_ANSWER = [
  "jobs and growth",
  "opening up the economy",
  "rich vs poor",
  "factory closures",
  "eastern cape unemployment",
  "did gear work",
  "liberalisation effects",
  "black workers employment",
  "women labor market",
  "district level evidence",
  "tariff cuts",
  "income per person",
  "national average hides what",
  "story before charts",
  "evidence section regressions",
  "what's the weather in cape town tomorrow",
];

/** Naive / non-economist reader — should still get an answer, not a hard decline. */
const LAYPERSON_SHOULD_ANSWER = [
  "what is this website even about",
  "i dont understand any of this can you help",
  "explain this like im 5",
  "why should i care about south africa",
  "what happened when apartheid ended",
  "did trade actually help normal people",
  "why cant people find jobs there",
  "why is south africa so unequal",
  "what does this map show me",
  "i dont get these graphs",
  "who are the two characters",
  "is the author saying trade is bad",
  "did the country get richer after 1994",
  "whats the main point",
  "explain this to my mom",
  "what should i remember from this",
  "why dont they just create more jobs",
  "what went wrong",
  "is everyone still poor",
  "what do the colors mean on the unemployment map",
  "where do i even start reading",
  "whats gear in plain english",
  "did becoming a democracy fix the economy",
  "rich people vs poor people here",
  "why didnt things improve for everyone",
  "so did opening up work or not",
  "what is apartheid in simple terms",
  "help im confused",
  "what is this essay trying to say",
  "why are there pictures of townships",
  "does this blame the government",
  "is unemployment still bad today",
  "too many numbers simplify please",
  "im just browsing why read this",
  "what is the sad takeaway",
  "did poor people benefit at all",
  "why is cape town mentioned",
  "what is the deal with the charts on unemployment",
  "who is sipho",
  "is this only about economics or also history",
  "my professor assigned this where do i start",
];

/** Layperson but clearly not this site — should still decline. */
const LAYPERSON_SHOULD_DECLINE = [
  "how do i reset my netflix password",
  "who will win the next US election",
  "give me a recipe for bobotie",
  "translate this page to spanish",
  "write my homework essay for me about climate change",
  "fix my broken iphone screen",
  "when is the next marvel movie",
];

let failed = 0;

const check = (query, expect, sectionId = "macro") => {
  const r = classify(query, sectionId);
  const gotDecline = r.route === "obvious-decline";
  const ok =
    expect === "decline" ? gotDecline : !gotDecline;
  if (!ok) {
    failed += 1;
    console.log(`FAIL [expect ${expect}] "${query}"`);
    console.log(`     → ${r.route} score=${r.topScore} strong=${r.strong} corpus=${r.corpus} vague=${r.vague} chunk=${r.enrichedTop ?? "—"}`);
  }
  return ok;
};

console.log("Essay Guide routing regression\n");
console.log("=== Expert / core ===");

let pass = 0;
for (const q of SHOULD_DECLINE) {
  if (check(q, "decline")) pass += 1;
}
for (const q of SHOULD_ANSWER) {
  if (check(q, "answer")) pass += 1;
}
for (const q of VAGUE_SHOULD_ANSWER) {
  if (check(q, "answer")) pass += 1;
}
for (const q of BORDERLINE_SHOULD_ANSWER) {
  if (check(q, "answer")) pass += 1;
}

console.log("\n=== Layperson (no econ background) ===");
for (const q of LAYPERSON_SHOULD_ANSWER) {
  if (check(q, "answer")) pass += 1;
}
for (const q of LAYPERSON_SHOULD_DECLINE) {
  if (check(q, "decline")) pass += 1;
}

const total =
  SHOULD_DECLINE.length +
  SHOULD_ANSWER.length +
  VAGUE_SHOULD_ANSWER.length +
  BORDERLINE_SHOULD_ANSWER.length +
  LAYPERSON_SHOULD_ANSWER.length +
  LAYPERSON_SHOULD_DECLINE.length;
console.log(`\n${pass}/${total} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
