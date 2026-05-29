# Essay Guide API (GPT-4o mini + abuse protection)

The live site calls `POST /api/chat` on Vercel. Keys stay server-side only.

## Required (OpenAI)

| Variable | Example | Notes |
|----------|---------|--------|
| `OPENAI_API_KEY` | `sk-...` | From [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ESSAY_GUIDE_MODEL` | `gpt-4o-mini` | Optional with `OPENAI_API_KEY` (default). With AI Gateway use `openai/gpt-4o-mini`. |

Redeploy after adding variables.

## Recommended (rate limits)

Without Upstash, origin checks and input caps still apply, but **per-IP limits are not shared** across serverless instances. For a public URL, add Upstash (free tier is enough for a class site).

1. Create a database at [console.upstash.com](https://console.upstash.com) (Redis, REST API enabled).
2. In Vercel → **Settings → Environment Variables**, add:

| Variable | Where to copy |
|----------|----------------|
| `UPSTASH_REDIS_REST_URL` | Upstash → database → REST → URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → REST → Token |

3. Redeploy.

### Default limits (per visitor IP)

- **5** questions per minute (burst)
- **25** questions per hour
- **600** questions per day (global cap across all visitors)

Override global daily cap with `ESSAY_GUIDE_DAILY_CAP` (number).

## Optional switches

| Variable | Purpose |
|----------|---------|
| `ESSAY_GUIDE_ENABLED` | Set to `false` to disable the API instantly |
| `ESSAY_GUIDE_ALLOWED_ORIGINS` | Comma-separated hostnames allowed in production (e.g. `econ30.vercel.app,my-preview.vercel.app`) |
| `ESSAY_GUIDE_SKIP_ORIGIN_CHECK` | Set to `true` only for debugging (not recommended in production) |
| `AI_GATEWAY_API_KEY` | Use Vercel AI Gateway instead of `OPENAI_API_KEY` |

## Verify

On the deployed site, browser console:

```javascript
fetch('/api/chat', { method: 'HEAD' }).then(r =>
  console.log(r.status, r.headers.get('X-Essay-Guide-RateLimit'))
);
```

- Status **200** and `X-Essay-Guide-RateLimit: upstash` → key + rate limits OK  
- Status **200** and `X-Essay-Guide-RateLimit: off` → key OK but add Upstash for distributed limits  
- Status **503** → missing key or guide disabled  

## Local dev

```bash
npx vercel env pull .env.local
npx vercel dev
```

Plain `python -m http.server` does not run `/api/chat`.
