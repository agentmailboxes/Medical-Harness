# Configuration

Copy `.env.example` to `.env` and fill in `CEREBRAS_API_KEY` and `MEDISEARCH_API_KEY`. The local `.env` is ignored by Git, Docker, and Vercel. Provider names in these keys are intentional; the product is medical-harness.

Settings are validated at startup. Invalid budgets, retry counts, or concurrency values prevent startup rather than creating unbounded behavior. Runtime environment values override `.env`.

| Variable | Default |
| --- | --- |
| `CEREBRAS_API_KEY` | `` |
| `CEREBRAS_MODEL` | `gpt-oss-120b` |
| `CEREBRAS_BASE_URL` | `https://api.cerebras.ai/v1` |
| `LLM_TEMPERATURE` | `0.3` |
| `LLM_MAX_TOKENS` | `4096` |
| `LLM_TIMEOUT_SECONDS` | `45` |
| `LLM_MAX_RETRIES` | `2` |
| `CEREBRAS_PROMPT_CACHE_KEY` | `` |
| `MEDISEARCH_API_KEY` | `` |
| `MAX_EVIDENCE_ARTICLES` | `8` |
| `MAX_TLDR_CHARS` | `400` |
| `MAX_SUMMARY_CHARS` | `1500` |
| `MAX_ANSWER_CHARS` | `24000` |
| `EVIDENCE_CACHE_ENTRIES` | `128` |
| `EVIDENCE_CACHE_TTL_SECONDS` | `600` |
| `STEP_CACHE_ENTRIES` | `256` |
| `STEP_CACHE_TTL_SECONDS` | `120` |
| `PORT` | `8080` |
| `LOG_LEVEL` | `INFO` |
| `CORS_ORIGINS` | `` |
| `REQUEST_TIMEOUT_SECONDS` | `150` |
| `MAX_CONCURRENT_REQUESTS` | `8` |
| `METRICS_TOKEN` | `` |
| `MAX_CONVERSATION_MESSAGES` | `39` |
| `MAX_MESSAGE_CHARS` | `8000` |
| `MAX_CONVERSATION_CHARS` | `32000` |
| `MAX_REQUEST_BYTES` | `262144` |
| `RATE_LIMIT_REQUESTS` | `20` |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` |

The total request deadline covers all steps. Each provider has a shorter transport timeout, bounded retries, connection pooling, and a circuit breaker that opens after three failed calls for 30 seconds. Only one recovery probe is allowed after cooldown. Authentication failures are not retried by the LLM provider.

A zero cache capacity or TTL disables storage. Cached classifications and evidence contain sensitive derived text in process memory, are scoped to a random HTTP-only browser session, and expire. They are never written to disk. All-waiter cancellation also cancels the shared provider task; one cancelled waiter does not interrupt another. Completed answers are not cached. Cache and quota limits are per process, not global across Vercel instances.

Set `METRICS_TOKEN` to expose aggregate token, cache, circuit and outcome metrics through authenticated `/api/metrics`. No patient text or API keys are included. Set `CORS_ORIGINS` only when a separate trusted frontend needs access. An empty value is suitable for the same-origin UI.
