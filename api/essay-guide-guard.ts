import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const MAX_QUESTION_CHARS = 500;
const MAX_CONTEXT_CHUNKS = 8;
const MAX_CHUNK_TEXT_CHARS = 900;

export function isGuideEnabled(): boolean {
  const flag = process.env.ESSAY_GUIDE_ENABLED;
  return flag !== "0" && flag !== "false";
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function allowedHostnames(): string[] {
  const fromEnv = (process.env.ESSAY_GUIDE_ALLOWED_ORIGINS ?? "")
    .split(/[\s,]+/)
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const defaults = [
    "econ30.vercel.app",
    "econ30finalproject.vercel.app",
    "www.econ30.vercel.app",
    "localhost",
    "127.0.0.1",
  ];

  const vercel = process.env.VERCEL_URL?.toLowerCase();
  if (vercel) defaults.push(vercel);

  return [...new Set([...defaults, ...fromEnv])];
}

function hostnameAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  const allowed = allowedHostnames();
  return allowed.some((entry) => {
    const base = entry.split(":")[0];
    return host === base || host.endsWith(`.${base}`);
  });
}

/** Block obvious cross-site abuse in production; allow missing Origin (same-origin fetch). */
export function checkOrigin(request: Request): Response | null {
  if (process.env.ESSAY_GUIDE_SKIP_ORIGIN_CHECK === "true") return null;
  if (process.env.VERCEL_ENV !== "production") return null;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!hostnameAllowed(new URL(origin).hostname)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      return null;
    } catch {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (!hostnameAllowed(new URL(referer).hostname)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return null;
}

export function validateQuestion(question: string): Response | null {
  if (!question) {
    return Response.json({ error: "Missing question" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      {
        error: `Question is too long (max ${MAX_QUESTION_CHARS} characters).`,
      },
      { status: 400 }
    );
  }
  return null;
}

export function clampContext<T extends { text?: string }>(chunks: T[]): T[] {
  return chunks.slice(0, MAX_CONTEXT_CHUNKS).map((c) => ({
    ...c,
    text: String(c.text ?? "").slice(0, MAX_CHUNK_TEXT_CHARS),
  }));
}

function rateLimitJson(message: string, resetMs: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
  return Response.json(
    { error: message, retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Content-Type": "application/json",
      },
    }
  );
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

let burstLimiter: Ratelimit | null = null;
let hourlyLimiter: Ratelimit | null = null;
let dailyLimiter: Ratelimit | null = null;

function getLimiters() {
  const redis = getRedis();
  if (!redis) return null;

  if (!burstLimiter) {
    burstLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "econ30-guide-burst",
    });
    hourlyLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(25, "1 h"),
      prefix: "econ30-guide-hour",
    });
    dailyLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        Number(process.env.ESSAY_GUIDE_DAILY_CAP ?? "600"),
        "1 d"
      ),
      prefix: "econ30-guide-day",
    });
  }

  return {
    burst: burstLimiter,
    hour: hourlyLimiter!,
    day: dailyLimiter!,
  };
}

/** Returns a Response when limited; null when allowed. Skips if Upstash env is not set. */
export async function checkRateLimit(
  request: Request
): Promise<Response | null> {
  const limiters = getLimiters();
  if (!limiters) return null;

  const ip = getClientIp(request);
  const id = ip === "unknown" ? "anon" : ip;

  const [burst, hour, day] = await Promise.all([
    limiters.burst.limit(id),
    limiters.hour.limit(id),
    limiters.day.limit("global"),
  ]);

  if (!burst.success) {
    return rateLimitJson(
      "Too many questions in a short time. Wait a minute, then try again.",
      burst.reset
    );
  }
  if (!hour.success) {
    return rateLimitJson(
      "Hourly limit reached for this guide. Browse the essay or try again later.",
      hour.reset
    );
  }
  if (!day.success) {
    return rateLimitJson(
      "The essay guide is at its daily capacity. Please try again tomorrow.",
      day.reset
    );
  }

  return null;
}

export function guardStatus(): {
  enabled: boolean;
  hasKey: boolean;
  rateLimit: boolean;
} {
  return {
    enabled: isGuideEnabled(),
    hasKey: hasLlmKey(),
    rateLimit: Boolean(getRedis()),
  };
}
